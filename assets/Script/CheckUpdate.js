// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

cc.Class({
    extends: cc.Component,

    properties: {
        m_ManifestUrl: {
            type: cc.Asset,
            default: null
        },
        m_UpdateTips:{
            type:cc.Label,
            default:null,
        },
        m_ProgressBar:{
            type:cc.ProgressBar,
            default:null,
        },
        m_ScrollView:{
            type:cc.ScrollView,
            default:null,
        },
        m_LogItem:{
            type:cc.Label,
            default:null,
        }
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        if (!cc.sys.isNative) {
            return;
        }
        this.PushLog("初始化热更新管理器")
        this.InitAssetsManager();
    },

    start () {
        if (!cc.sys.isNative) {
            return;
        }
        this.PushLog("开始检测热更新")
        if(this.CheckNeedUpdate() == false) return;

    },

    // update (dt) {},

    
    CheckCb: function (event) {
        cc.log('Code: ' + event.getEventCode());
        var isNewVersion = false;
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.PushLog("没有找到本地版本文件,热更跳过!")
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.PushLog("下载版本文件失败,热更跳过,请点击重试!")
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.PushLog("已经是最新版本了!")
                this.RunGame();
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                this.PushLog("发现新版本,是否开始热更!")
                //现在走的自动更新,可以根据自己需求判断WIFI什么乱起八早的更新
                isNewVersion = true;
                break;
            default:
                return;
        }
        
        this._am.setEventCallback(null);
        this._checkListener = null;
        if(isNewVersion)
        {
            this.StartUpdate();
        }
    },


    UpdateCb: function (event) {
        var needRestart = false;
        var failed = false;
        this.PushLog("[UpdateCb] event.getEventCode():"+event.getEventCode())
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.PushLog("没有找到本地版本文件,热更跳过!")
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                this.m_ProgressBar.progress = event.getPercent();
                this.m_UpdateTips.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                this.PushLog("[Updated file:"+this.m_UpdateTips.string);
                var msg = event.getMessage();
                if (msg) {
                    this.PushLog("[Updated file:"+msg);
                    this.m_UpdateTips.string = '[Updated file: ' + msg+']['+event.getDownloadedFiles() + ' / ' + event.getTotalFiles()+']';
                }
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.m_UpdateTips.string = "下载版本文件失败,热更跳过,请点击重试!";
                this.PushLog("下载版本文件失败,热更跳过,请点击重试!")
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.m_UpdateTips.string = "已经是最新版本了!";
                this.PushLog("已经是最新版本了!")
                this._am.setEventCallback(null);
                this.RunGame();
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                this.m_UpdateTips.string = '更新结束: ' + event.getMessage();
                this.PushLog(this.m_UpdateTips.string)
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                this.m_UpdateTips.string = '更新失败: ' + event.getMessage();
                this.PushLog(this.m_UpdateTips.string)
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                this.m_UpdateTips.string = '资源更新错误: ' + event.getAssetId() + ', ' + event.getMessage();
                this.PushLog(this.m_UpdateTips.string)
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                this.m_UpdateTips.string = event.getMessage();
                this.PushLog(this.m_UpdateTips.string)
                break;
            default:
                break;
        }

        if (failed) {
            this._am.setEventCallback(null);
        }
        
        if (needRestart) {
            this.RestartGame();
        }
    },

    CheckNeedUpdate()
    {
        if(this.m_ManifestUrl == null)
        {
            this.m_UpdateTips.string = '还未配置初始资源文件,请配置!';
            this.PushLog(this.m_UpdateTips.string)
            return false;
        }
        this.m_UpdateTips.string = '开始检测热更新!';
        this.PushLog(this.m_UpdateTips.string)
        cc.log("this.m_ManifestUrl :",this.m_ManifestUrl);
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            var url = this.m_ManifestUrl.nativeUrl;
            this.PushLog("this.m_ManifestUrl:"+JSON.stringify(this.m_ManifestUrl));
            this.PushLog("开始检测热更新 url:"+url)
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
                this.PushLog("cc.loader.md5Pipe url:"+url)
            }
            this._am.loadLocalManifest(url);
        }else{
            this.PushLog("状态不对:"+this._am.getState());
            this.PushLog("jsb.AssetsManager.State.UNINITED:"+jsb.AssetsManager.State.UNINITED);
        }
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {;
            this.m_UpdateTips.string = '本地版本文件加载失败!';
            this.PushLog(this.m_UpdateTips.string)
            return false;
        }

        this._am.setEventCallback(this.CheckCb.bind(this));
        this._am.checkUpdate();
    },

    InitAssetsManager()
    {
        var self = this;
        var srcPath = localStorage.getItem('HotUpdateSearchPaths');
        srcPath = this.DelSameSrc(srcPath);
        if(srcPath != null && srcPath != '')
        {
            localStorage.setItem('HotUpdateSearchPaths',srcPath);
        }
        this.PushLog(srcPath);
        this._storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'blackjack-remote-asset');
        this.PushLog('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!Storage path for remote asset : ' + this._storagePath);
        this.PushLog("localStorage.getItem('HotUpdateSearchPaths')："+localStorage.getItem('HotUpdateSearchPaths'))

        this.PushLog('Storage path for remote asset : ' +(localStorage.getItem('HotUpdateSearchPaths') || "null"));
        // Setup your own version compare handler, versionA and B is versions in string
        // if the return value greater than 0, versionA is greater than B,
        // if the return value equals 0, versionA equals to B,
        // if the return value smaller than 0, versionA is smaller than B.
        var self = this;
        this.versionCompareHandle = function (versionA, versionB) {
            self.PushLog("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB)
            var vA = versionA.split('.');
            var vB = versionB.split('.');
            for (var i = 0; i < vA.length; ++i) {
                var a = parseInt(vA[i]);
                var b = parseInt(vB[i] || 0);
                if (a === b) {
                    continue;
                }
                else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            }
            else {
                return 0;
            }
        };

        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager('', this._storagePath, this.versionCompareHandle);

        var tips = this.m_UpdateTips;
        // Setup the verification callback, but we don't have md5 check function yet, so only print some message
        // Return true if the verification passed, otherwise return false
        this._am.setVerifyCallback(function (path, asset) {
            // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
            var compressed = asset.compressed;
            // Retrieve the correct md5 value.
            var expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            var relativePath = asset.path;
            // The size of asset file, but this value could be absent.
            var size = asset.size;
            self.PushLog(size+"size");
            if (compressed) {
                tips.string = "Verification passed : " + relativePath;
                self.PushLog(tips.string)
                return true;
            }
            else {
                tips.string = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
                self.PushLog(tips.string)
                return true;
            }
        });


        if (cc.sys.os === cc.sys.OS_ANDROID) {
            this._am.setMaxConcurrentTask(2);
            cc.log("Max concurrent tasks count have been limited to 2");
        }
    },

    StartUpdate: function () {
        this.PushLog('热更开始！！！！！！')
        if (this._am) {
            this._am.setEventCallback(this.UpdateCb.bind(this));

            if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
                // Resolve md5 url
                var url = this.m_ManifestUrl.nativeUrl;
                this.PushLog("this.m_ManifestUrl.nativeUrl:",url);
                if (cc.loader.md5Pipe) {
                    url = cc.loader.md5Pipe.transformURL(url);
                    this.PushLog("url:",url);
                }
                this._am.loadLocalManifest(url);
            }else{
                this.PushLog('热更失败,状态不对:'+this._am.getState())
                this.PushLog('热更失败,状态不对 jsb.AssetsManager.State.UNINITED :'+jsb.AssetsManager.State.UNINITED)
            }
            this._am.update();
        }else{
            this.PushLog('热更失败,没有初始化管理器')
        }
    },
    //没有更新直接开始游戏
    RunGame()
    {
        this.m_UpdateTips.string = "游戏开始!";
        this.PushLog(this.m_UpdateTips.string)
        //cc.director.loadScene("Game");

    },

    PushLog(str)
    {
        if(str == null) return;
        cc.log(str);
        var item = cc.instantiate(this.m_LogItem.node);
        item.getComponent(cc.Label).string = str;
        this.m_ScrollView.content.addChild(item);
        this.m_ScrollView.scrollToBottom();
    },

    RestartGame()
    {
        // this._am.setEventCallback(null);
        // // Prepend the manifest's search path
        // var searchPaths = jsb.fileUtils.getSearchPaths();
        // var newPaths = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'blackjack-remote-asset');//;this._am.getLocalManifest().getSearchPaths();
        // this.PushLog("新的热更路径:"+newPaths);
        // console.log(JSON.stringify(newPaths));
        // Array.prototype.unshift.apply(searchPaths, newPaths);
        // // This value will be retrieved and appended to the default search path during game startup,
        // // please refer to samples/js-tests/main.js for detailed usage.
        // // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
        // cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(newPaths));
        // jsb.fileUtils.setSearchPaths(searchPaths);
        // this.PushLog("新的热更路径:"+newPaths);
        // // cc.audioEngine.stopAll();
        // // cc.game.restart();

        this._am.setEventCallback(null);
        this._updateListener = null;
        // Prepend the manifest's search path
        var searchPaths = jsb.fileUtils.getSearchPaths();
        var newPaths = this._am.getLocalManifest().getSearchPaths();
        console.log(JSON.stringify(newPaths));
        Array.prototype.unshift.apply(searchPaths, newPaths);
        // This value will be retrieved and appended to the default search path during game startup,
        // please refer to samples/js-tests/main.js for detailed usage.
        // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
        cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
        jsb.fileUtils.setSearchPaths(searchPaths);

        cc.audioEngine.stopAll();
        cc.game.restart();
    },
    DelSameSrc(stringPath)
    {
        if(stringPath == null || stringPath == '') return stringPath;
        this.PushLog("检测重复路径前:"+stringPath);
        var checkSame = {};
        var newArrSrc = [];
        var arrSrc = JSON.parse(stringPath);
        if(arrSrc != null)
        {
            for(var key in arrSrc)
            {
                if(checkSame[ arrSrc[key] ] == null)
                {
                    checkSame[ arrSrc[key] ] = 1;
                    newArrSrc.push(arrSrc[key]);
                }
            }
            stringPath = JSON.stringify(newArrSrc);
        }
        this.PushLog("检测重复路径后:"+stringPath);
        return stringPath;
    }
});
