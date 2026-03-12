import { getAllSnippets } from '../lib/db';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_SNIPPETS') {
      getAllSnippets().then((snippets) => {
        sendResponse(snippets);
      });
      return true; // async response
    }
  });
});
