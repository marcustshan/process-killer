module.exports = {
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: 'src/background.js',
      builderOptions: {
        productName: 'Process Killer',
        appId: 'com.byulsoft.pk',
        win: {
          icon: 'src/assets/icons/win/icon.ico'
        }
      }
    }
  }
}
