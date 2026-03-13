import { getAllSnippets, getSetting, setSetting, addClipboardItem, getClipboardHistory } from '../lib/db';
import { getSessionKey } from '../lib/session';

export default defineBackground(() => {
  // Mark onboarding as needed on first install
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      setSetting('onboardingComplete', false);
    }
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_SNIPPETS') {
      (async () => {
        const encEnabled = await getSetting('encryptionEnabled', false);
        if (encEnabled) {
          const key = await getSessionKey();
          // If locked, return empty — content script will get no snippets until unlocked
          if (!key) { sendResponse([]); return; }
          const snippets = await getAllSnippets(key);
          sendResponse(snippets);
        } else {
          const snippets = await getAllSnippets();
          sendResponse(snippets);
        }
      })();
      return true; // async response
    }

    if (message.type === 'GET_SETTING') {
      getSetting(message.key, message.default).then((val) => {
        sendResponse(val);
      });
      return true;
    }

    if (message.type === 'SAVE_CLIPBOARD') {
      (async () => {
        const encEnabled = await getSetting('encryptionEnabled', false);
        if (encEnabled) {
          const key = await getSessionKey();
          if (key) await addClipboardItem(message.text, key).catch(console.error);
          // If locked, skip saving clipboard — privacy first
        } else {
          await addClipboardItem(message.text).catch(console.error);
        }
      })();
      return false; // no response needed
    }

    if (message.type === 'GET_CLIPBOARD_LAST') {
      (async () => {
        const encEnabled = await getSetting('encryptionEnabled', false);
        const key = encEnabled ? (await getSessionKey() ?? undefined) : undefined;
        const history = await getClipboardHistory(key);
        sendResponse(history.length > 0 ? history[0].text : null);
      })();
      return true;
    }

    if (message.type === 'SET_BADGE') {
      if (message.active) {
        browser.action.setBadgeText({ text: '●' });
        browser.action.setBadgeBackgroundColor({ color: '#7c3aed' });
      } else {
        browser.action.setBadgeText({ text: '' });
      }
      return false;
    }
  });
});
