import { getAllSnippets, getSetting } from '../lib/db';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_SNIPPETS') {
      getAllSnippets().then((snippets) => {
        sendResponse(snippets);
      });
      return true; // async response
    }
    if (message.type === 'GET_SETTING') {
      getSetting(message.key, message.default).then((val) => {
        sendResponse(val);
      });
      return true;
    }
  });
});
