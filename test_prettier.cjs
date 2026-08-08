const { app, ipcMain } = require('electron');
app.getPath = () => '/Users/vikramadityasingh';

const prettier = require('prettier');
const m = require('prettier/plugins/markdown');

async function test() {
  try {
    const res = await prettier.format('# Hello   World  ', {
      parser: 'markdown',
      plugins: [m]
    });
    console.log('FORMAT SUCCESS:', res);
  } catch (e) {
    console.error('FORMAT ERROR:', e);
  }
}
test();
