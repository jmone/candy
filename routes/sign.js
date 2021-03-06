// sign

var Duoshuo = require('duoshuo'),
    async = require('async');

exports = module.exports = function($ctrlers) {

    var user = $ctrlers.user;

    var createUser = function(result, cb) {
        user.create({
            type: result.type ? result.type : 'normal',
            duoshuo: {
                user_id: result.user_id,
                access_token: result.access_token
            }
        }, cb)
    }

    return {
        // PAGE: 登入
        signin: function(req, res, next) {
            var code = req.query.code,
                duoshuo = new Duoshuo(res.locals.app.locals.site.duoshuo);

            if (code) {
                duoshuo.auth(code, function(err, result) {
                    // 当通信正常时
                    if (!err) {
                        var result = result.body;
                        // 当返回正确时
                        if (result.code == 0) {
                            async.waterfall([

                                function(callback) {
                                    user.readByDsId(result.user_id, function(err, u) {
                                        callback(err, u)
                                    });
                                },
                                function(u, callback) {
                                    if (u) {
                                        req.session.user = u;
                                        res.redirect('back');
                                    } else {
                                        user.count(function(err, count) {
                                            callback(err, count);
                                        });
                                    }
                                },
                                function(count, callback) {
                                    if (count == 0) {
                                        result['type'] = 'admin';
                                    };
                                    createUser(result, function(err, baby) {
                                        callback(err, count, baby);
                                    });
                                }
                            ], function(err, count, baby) {
                                if (!err) {
                                    req.session.user = baby;
                                    if (count == 0) {
                                        res.redirect('/admin/');
                                    } else {
                                        res.redirect('/member/' + req.session.user._id);
                                    }
                                } else {
                                    next(err);
                                }
                            });

                        } else {
                            // 如果多说挂了
                            next(new Error('多说登录出错，请稍后再试或者联系管理员，具体错误:' + result.errorMessage))
                        }
                    } else {
                        next(err);
                    }
                })
            } else {
                res.render('sign');
            }
        },

        // PAGE: 登出
        signout: function(req, res) {
            if (req.session.user) {
                delete req.session.user;
                res.redirect('back');
            } else {
                res.redirect('back');
            }
        },

        // MIDDLEWARE: 检查用户是否管理员用户
        checkAdmin: function(req, res, next) {
            if (res.locals.user && res.locals.user.type == 'admin') {
                next();
            } else {
                res.redirect('/');
            }
        }

    }

}