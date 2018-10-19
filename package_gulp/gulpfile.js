const gulp = require("gulp"),
    htmlMin = require("gulp-htmlmin"),
    runSequence = require("run-sequence"),
    rev = require("gulp-rev"),
    revCollector = require("gulp-rev-collector"),
    del = require("del"),
    uglify = require("gulp-uglify"),
    cleanCss = require("gulp-clean-css"),
    autoprefixer = require("gulp-autoprefixer"),
    babel = require("gulp-babel"),
    sass = require("gulp-sass"),
    concat = require("gulp-concat"),
    browserSync = require("browser-sync").create();

/**
 * 修改文件配置路径：注意变量对应
 * 默认源文件路径 src： srcDir = "src";
 * 默认生成文件路径 dest： targetDir = "dest";
 * 默认处理所有html文件：targetHtml = "*.html";
 * 默认sass文件路径 src/sass： sassDir = srcDir + "/sass";
 * 默认ES6 js文件路径 src/js: babelDir = srcDir + "/js";
 * 默认js源文件路径 src/js/：jsSrcDir = srcDir + "/js";
 * 默认js生产文件路径 dest/js/：jsTargetDir = targetDir + "/js";
 * 默认css源文件路径 src/css/：cssSrcDir = srcDir + "/css";
 * 默认css生产文件路径 dest/css/：cssTargetDir = targetDir + "/css";
 */

let srcDir = "src";         //配置源文件路径
let targetDir = "dest";     //配置目标文件路径

let sass2Filename = "style.css";    //配置sass处理后生成的文件
let sassDir = srcDir + "/sass";     //配置需要sass处理源文件路径，默认为源文件路径下的sass文件夹

let babelDir = srcDir + "/js";      //配置需要babel处理源文件路径，默认为源文件路径下的js文件夹

let jsSrcDir = srcDir + "/js";
let jsTargetDir = targetDir + "/js";

let cssSrcDir = srcDir + "/css";
let cssTargetDir = targetDir + "/css";


let targetHtml = "test.html";      //配置html文件名称，可以指定为某个文件 如：test.html
/**
 * 热启动开发调试环境
 * 默认启动端口 8090
 * 默认打开页面 由 targetHtml变量控制
 *      为所有html文件(*.html)，默认启动index.html
 *      为指定html文件(test.html)，默认启动test.html
 */
gulp.task("dev", ["build"], function () {
    browserSync.init({
        port: 8090,
        server: {
            baseDir: [targetDir],
            index: targetHtml === "*.html" ? "index.html" : targetHtml
        }
        // reloadDebounce: 1000
    });
    gulp.watch(srcDir + "/**/*.*", ["freshFiles"]);
    gulp.watch(targetDir + "/*.html").on("change", browserSync.reload);
    gulp.watch(targetDir + "/**/*.js").on("change", browserSync.reload);
    gulp.watch(targetDir + "/**/*.css").on("change", browserSync.reload);
});


/**
 * 生产文件生成
 * 功能包含：
 *          sass预处理为css，默认转换为 css/style.css文件，使用变量 sass2Filename 配置
 *          css文件添加webkit前缀、css文件压缩
 *          es6转es5、js压缩
 *          css/js/scss之外文件移动
 *          html文件资源添加hash值、html内容压缩
 */

gulp.task("freshFiles", ["serve_sass", "htmlMin"], function (done) {
    setTimeout(function () {
        runSequence(
            ["hash2css"],
            ["hash2js"],
            ["moveAssets"],
            ["hash2htmlWithCss"],
            ["hash2htmlWithJs"],
            ["hash2htmlWithAssets"],
            ["rmHashJson"],
            done);
    }, 10);
});

gulp.task("build", function (done) {
    del(targetDir);
    setTimeout(function () {
        runSequence(["freshFiles"], done);
    }, 10);
});

gulp.task("moveAssets", function () {
    return gulp.src([
            srcDir + "/**/*.*",
            "!" + srcDir + "/**/*.html",
            "!" + srcDir + "/**/*.js",
            "!" + srcDir + "/**/*.css",
            "!" + srcDir + "/**/*.scss"
        ])
        .pipe(gulp.dest(targetDir))
        .pipe(rev())
        .pipe(rev.manifest())
        .pipe(gulp.dest(targetDir));
});

gulp.task("serve_sass", function () {
    gulp.src(sassDir + "/**/*.scss")
        .pipe(sass())
        .pipe(concat(sass2Filename))
        .pipe(gulp.dest(cssSrcDir));
});

gulp.task("serve_babel", function () {
    return gulp.src(babelDir + "/**/*.js")
        .pipe(babel({
            presets: ["es2015"]
        }))
        .pipe(uglify())
        .pipe(gulp.dest(targetDir));
});

gulp.task("htmlMin", function () {
    let options = {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: false,
        removeEmptyAttributes: false,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyJS: true,
        minifyCSS: true
    };
    gulp.src([srcDir + "/" + targetHtml])
        .pipe(htmlMin(options))
        .pipe(gulp.dest(targetDir));
});

gulp.task("armCss", function () {
    return gulp.src(cssSrcDir + "/*.css")
        .pipe(autoprefixer({
            browsers: ["last 2 versions"]
        }))
        .pipe(cleanCss({compatibility: "ie8"}))
        .pipe(gulp.dest(cssTargetDir));
});

gulp.task("hash2css", [], function () {
    return gulp.src(cssSrcDir + "/*.css")
        .pipe(autoprefixer({
            browsers: ["last 2 versions"],
            cascade: false
        }))
        .pipe(cleanCss({compatibility: "ie8"}))
        .pipe(rev())
        .pipe(gulp.dest(cssTargetDir))
        .pipe(rev.manifest())
        .pipe(gulp.dest(cssTargetDir));
});

gulp.task("hash2js", function () {
    return gulp.src(jsSrcDir + "/*.js")
        .pipe(babel({
            presets: ["@babel/env"]
        }))
        .pipe(uglify())
        .pipe(rev())
        .pipe(gulp.dest(jsTargetDir))
        .pipe(rev.manifest())
        .pipe(gulp.dest(jsTargetDir));
});

gulp.task("hash2htmlWithCss", function () {
    return gulp.src([cssTargetDir + "/rev-manifest.json", targetDir + "/" + targetHtml])
        .pipe(revCollector())
        .pipe(gulp.dest(targetDir));
});

gulp.task("hash2htmlWithJs", function () {
    return gulp.src([jsTargetDir + "/rev-manifest.json", targetDir + "/" + targetHtml])
        .pipe(revCollector())
        .pipe(gulp.dest(targetDir));
});

gulp.task("hash2htmlWithAssets", function () {
    return gulp.src([targetDir + "/rev-manifest.json", targetDir + "/" + targetHtml])
        .pipe(revCollector())
        .pipe(gulp.dest(targetDir));
});

gulp.task("rmHashJson", function () {
    return del([
        targetDir + "/rev-manifest.json",
        cssTargetDir + "/rev-manifest.json",
        jsTargetDir + "/rev-manifest.json"
    ]);
});
