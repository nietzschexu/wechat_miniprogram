Page({
    data: {
      content: '',
      imageList: [],
      imageSize: 0,
      canSubmit: false,  // 是否可提交
      contentLength: 0   // 当前字数
    },
  
    onLoad(options) {
        wx.setNavigationBarTitle({
          title: '百草味食品意见箱'
        });
      },
  
    onReady() {
      this.calcImageSize();
    },
  
    calcImageSize() {
      const query = wx.createSelectorQuery();
      query.select('.image-area').boundingClientRect(rect => {
        if (rect) {
          const containerWidth = rect.width;
          const size = (containerWidth - 2 * 20) / 3;
          this.setData({
            imageSize: size
          });
        }
      }).exec();
    },
  
    onInput(e) {
        let value = e.detail.value;
        if (value.length >= 120) {
          value = value.slice(0, 120); // 强制截取前120字符
          wx.showToast({
            title: '最多输入120字',
            icon: 'none'
          });
        }
        this.setData({
          content: value,
          contentLength: value.length
        }, this.updateCanSubmit);
      },
  
    chooseImage() {
      wx.chooseImage({
        count: 5 - this.data.imageList.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: res => {
          const newImages = res.tempFilePaths;
          this.setData({
            imageList: this.data.imageList.concat(newImages)
          }, this.updateCanSubmit);
        },
        fail: err => {
          console.error('选择图片失败', err);
        }
      });
    },
    removeImage(e) {
        const index = e.currentTarget.dataset.index;
        const imageList = this.data.imageList;
        imageList.splice(index, 1);
        this.setData({ imageList }, this.updateCanSubmit);
      },
  
    updateCanSubmit() {
      const canSubmit = this.data.content.trim() !== '' || this.data.imageList.length > 0;
      this.setData({
        canSubmit: canSubmit
      });
    },
  
    async onSubmit() {
        if (!this.data.canSubmit) {
            return;  // 不可提交时直接返回
        }

        const db = wx.cloud.database();
        const imageList = this.data.imageList;
        let imageUrls = [];

        // 显示加载提示
        wx.showLoading({
            title: '正在提交...',
            mask: true
        });

        try {
            // 上传图片
            for (let i = 0; i < imageList.length; i++) {
                const cloudPath = `feedback-images/${Date.now()}-${i}.png`;
                const uploadRes = await wx.cloud.uploadFile({
                    cloudPath: cloudPath,
                    filePath: imageList[i]
            });
             imageUrls.push(uploadRes.fileID);
        }

            // 写入数据库（使用云端时间更精确）
        await db.collection('feedback').add({
            data: {
                content: this.data.content,
                images: imageUrls,
                createTime: db.serverDate()
            }
        });

        // 隐藏加载提示
        wx.hideLoading();

        // 成功提示
        wx.showToast({
            title: '提交成功',
            icon: 'success'
        });

            // ✅ 清空表单并刷新界面状态
        this.setData({
            content: '',
            contentLength: 0,
            imageList: [],
            canSubmit: false
        });

    } catch (err) {
        wx.hideLoading();
        console.error('提交失败', err);
        wx.showToast({
            title: '提交失败',
            icon: 'none'
        });
    }
    }
});