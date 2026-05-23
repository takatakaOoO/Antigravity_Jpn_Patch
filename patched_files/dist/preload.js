"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Preload script — runs in every BrowserWindow before the page loads.
 * Exposes a minimal, secure API via contextBridge so the renderer can
 * communicate with the main-process auto-updater without nodeIntegration.
 */
const electron_1 = require("electron");
const updaterAPI = {
    onStateChanged: (callback) => {
        const handler = (_event, state) => {
            callback(state);
        };
        electron_1.ipcRenderer.on('updater:state-changed', handler);
        // Return unsubscribe function
        return () => {
            electron_1.ipcRenderer.removeListener('updater:state-changed', handler);
        };
    },
    applyUpdate: () => electron_1.ipcRenderer.invoke('updater:apply'),
    quitAndInstall: () => electron_1.ipcRenderer.invoke('updater:quit-and-install'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('updater:check-for-updates'),
};
const dialogAPI = {
    showOpenDialog: () => electron_1.ipcRenderer.invoke('dialog:open-workspace'),
};
const notificationAPI = {
    send: (options) => electron_1.ipcRenderer.invoke('notification:send', options),
    openSystemPreferences: () => electron_1.ipcRenderer.invoke('notification:open-system-preferences'),
    onClicked: (callback) => {
        const handler = (_event, payload) => {
            callback(payload);
        };
        electron_1.ipcRenderer.on('notification:clicked', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('notification:clicked', handler);
        };
    },
};
const storageAPI = {
    getItems: () => electron_1.ipcRenderer.invoke('storage:get-items'),
    updateItems: (changes) => electron_1.ipcRenderer.invoke('storage:update-items', changes),
    onChanged: (callback) => {
        const handler = (_event, changes) => {
            callback(changes);
        };
        electron_1.ipcRenderer.on('storage:changed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('storage:changed', handler);
        };
    },
};
const logsAPI = {
    getElectronLogs: () => electron_1.ipcRenderer.invoke('logs:electron'),
};
const extensionsAPI = {
    sendAuthorities: (authoritiesMap) => electron_1.ipcRenderer.invoke('extensions:send-authorities', authoritiesMap),
};
const deepLinkAPI = {
    onDeepLink: (callback) => {
        const handler = (_event, url) => {
            callback(url);
        };
        electron_1.ipcRenderer.on('deep-link', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('deep-link', handler);
        };
    },
    getStoredDeepLink: () => electron_1.ipcRenderer.invoke('deep-link:get-stored'),
};
const agentAPI = {
    updateActiveAgentCount: (count) => electron_1.ipcRenderer.invoke('agent:update-active-count', count),
};
const electronNativeAPI = {
    getZoomLevel: () => electron_1.webFrame.getZoomFactor(),
    setTitleBarOverlay: (options) => electron_1.ipcRenderer.invoke('window:set-title-bar-overlay', options),
    minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
    unmaximize: () => electron_1.ipcRenderer.invoke('window:unmaximize'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window:is-maximized'),
    close: () => electron_1.ipcRenderer.invoke('window:close'),
    toggleDevTools: () => electron_1.ipcRenderer.invoke('window:toggle-devtools'),
    zoomIn: () => {
        const current = electron_1.webFrame.getZoomLevel();
        electron_1.webFrame.setZoomLevel(current + 0.5);
    },
    zoomOut: () => {
        const current = electron_1.webFrame.getZoomLevel();
        electron_1.webFrame.setZoomLevel(current - 0.5);
    },
    resetZoom: () => {
        electron_1.webFrame.setZoomLevel(0);
    },
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:open-external', url),
};
const ideAPI = {
    isInstalled: () => electron_1.ipcRenderer.invoke('ide:is-installed'),
};
electron_1.contextBridge.exposeInMainWorld('electronUpdater', updaterAPI);
electron_1.contextBridge.exposeInMainWorld('dialog', dialogAPI);
electron_1.contextBridge.exposeInMainWorld('nativeNotifications', notificationAPI);
electron_1.contextBridge.exposeInMainWorld('nativeStorage', storageAPI);
electron_1.contextBridge.exposeInMainWorld('logs', logsAPI);
electron_1.contextBridge.exposeInMainWorld('extensions', extensionsAPI);
electron_1.contextBridge.exposeInMainWorld('deepLink', deepLinkAPI);
electron_1.contextBridge.exposeInMainWorld('agent', agentAPI);
electron_1.contextBridge.exposeInMainWorld('electronNative', electronNativeAPI);
electron_1.contextBridge.exposeInMainWorld('ide', ideAPI);
// ---------------------------------------------------------------------------
// WebUI 日本語化 — DOM翻訳スクリプト (Antigravity Jpn Mod)
// ---------------------------------------------------------------------------
// Language Serverが配信するWebUIのテキストを日本語に置換する。
// MutationObserverでDOMの変更を監視し、動的に挿入されるテキストも翻訳する。
const JA_TRANSLATIONS = {
    // ヘッダー・ナビゲーション
    'New chat': '新しいチャット',
    'New Chat': '新しいチャット',
    'History': '履歴',
    'Settings': '設定',
    'Sign in': 'ログイン',
    'Sign out': 'ログアウト',
    'Sign In': 'ログイン',
    'Sign Out': 'ログアウト',
            // --- メニュー / ビュー関連 ---
    'Zoom In': 'ズームイン',
    'Zoom Out': 'ズームアウト',
    'Reset Zoom': 'ズームをリセット',
    'Toggle Developer Tools': '開発者ツールを切り替え',
    'Minimize': '最小化',
    'Maximize': '最大化',
    'Conversation History': 'チャット履歴',
    'Scheduled Tasks': 'スケジュールされたタスク',
    'Projects': 'プロジェクト',
    'Conversations': 'チャット',
    'Show all': 'すべて表示',
    'Not in Project': 'プロジェクト外',

    // --- 設定メニュー項目 ---
    'Account': 'アカウント',
    'Permissions': '権限',
    'Models': 'モデル',
    'Customizations': 'カスタマイズ',
    'Browser': 'ブラウザ',
    'App': 'アプリ',

    // --- プロジェクト設定画面 ---
    'Manage project folders, agent settings, and permissions.': 'プロジェクトフォルダ、エージェント設定、権限を管理します。',
    'Folders': 'フォルダ',
    'Add Folder': 'フォルダを追加',
    'Agent Settings': 'エージェント設定',
    'Security Preset': 'セキュリティプリセット',
    'Choose a predefined security preset for the agent. This controls terminal auto-execution policy, and file access policy.': 'エージェントの事前定義されたセキュリティプリセットを選択します。これにより、ターミナルの自動実行ポリシーやファイルアクセス権限が制御されます。',
    'Agent Behavior': 'エージェントの動作',
    'Artifact Review Policy': 'アーティファクトのレビューポリシー',
    'Specifies Agent''s behavior when asking for review on artifacts, which are documents it creates to enable a richer conversation experience.': 'エージェントが作成したドキュメント（アーティファクト）のレビューを求める際の動作を指定します。',
    'Always Ask': '常に確認する',
    'Local Permissions': 'ローカル権限',
    'Inherits from global settings. Local permissions have higher priority.': 'グローバル設定を継承します。ローカル権限が優先されます。',
    'File Access Rules': 'ファイルアクセスルール',
    'Configure allowed and denied paths for file reads and writes.': 'ファイルの読み書きを許可/拒否するパスを設定します。',
    'Network Access Rules': 'ネットワークアクセスルール',
    'Configure allowed and denied URLs for reading.': '読み取りを許可/拒否するURLを設定します。',
    'Terminal Commands': 'ターミナルコマンド',
    'Configure allowed terminal commands.': '許可するターミナルコマンドを設定します。',
    'Commands Outside Sandbox': 'サンドボックス外のコマンド',
    'Configure allowed commands outside the sandbox.': 'サンドボックス外で許可するコマンドを設定します。',
    'MCP Tools': 'MCP ツール',
    'Configure external tools via Model Context Protocol.': 'Model Context Protocol 経由の外部ツールを設定します。',
    'The breakdown below shows token usage from customizations like skills, rules, and MCP. If the budget is exceeded, large customizations will be truncated automatically.': '以下の内訳は、スキル、ルール、MCPなどのカスタマイズによるトークン使用量を示しています。予算を超えた場合、大きなカスタマイズは自動的に切り捨てられます。',
    'Rules': 'ルール',
    'Global': 'グローバル',
    'Danger Zone': '危険エリア',
    'Delete Project': 'プロジェクトを削除',

    // --- アプリ設定画面 ---
    'App Settings': 'アプリ設定',
    'Manage application settings.': 'アプリケーションの設定を管理します。',
    'Prevent Sleep': 'スリープを防止',
    'Prevent the computer from sleeping while the app is running.': 'アプリの実行中はコンピューターがスリープしないようにします。',
    'Keep In Menu Bar': 'メニューバーに保持',
    'The app will be accessible from the menu bar and will keep running in the background when all windows are closed.': 'すべてのウィンドウを閉じても、アプリはメニューバーからアクセス可能で、バックグラウンドで実行され続けます。',
    'Notifications': '通知',
    'Notification Settings': '通知設定',
    'To modify notification settings, open your operating system''s system preferences.': '通知設定を変更するには、オペレーティングシステムのシステム環境設定を開いてください。',
    'Open System Preferences': 'システム環境設定を開く',

    // --- 画像から追加したメニュー項目 ---
    'File': 'ファイル',
    'View': '表示',
    'Window': 'ウィンドウ',
    'New Conversation': '新しいチャット',
    'Create Project': 'プロジェクト作成',
    'Command Palette': 'コマンドパレット',
    // チャットUI
    'Type a message': 'メッセージを入力',
    'Send': '送信',
    'Stop': '停止',
    'Copy': 'コピー',
    'Copied!': 'コピーしました！',
    'Retry': 'リトライ',
    'Cancel': 'キャンセル',
    'Close': '閉じる',
    'Delete': '削除',
    'Edit': '編集',
    'Save': '保存',
    'Discard': '破棄',
    // エージェント関連
    'Agent': 'エージェント',
    'Agents': 'エージェント',
    'Running': '実行中',
    'Completed': '完了',
    'Failed': '失敗',
    'Pending': '待機中',
    'Queued': 'キュー待ち',
    'Stopped': '停止済み',
    'Start': '開始',
    'Pause': '一時停止',
    'Resume': '再開',
    // ファイル・ワークスペース
    'Open workspace': 'ワークスペースを開く',
    'Open Workspace': 'ワークスペースを開く',
    'Open file': 'ファイルを開く',
    'Open File': 'ファイルを開く',
    'Open folder': 'フォルダを開く',
    'Open Folder': 'フォルダを開く',
    'No workspace open': 'ワークスペースが開かれていません',
    // 設定
    'General': '一般',
    'Appearance': '外観',
    'Theme': 'テーマ',
    'Dark': 'ダーク',
    'Light': 'ライト',
    'System': 'システム',
    'Language': '言語',
    'About': 'バージョン情報',
    'Version': 'バージョン',
    'Check for updates': 'アップデートを確認',
    'Check for Updates': 'アップデートを確認',
    'Up to date': '最新です',
    'Update available': 'アップデートがあります',
    'Download': 'ダウンロード',
    'Install': 'インストール',
    'Restart': '再起動',
    // 通知・ステータス
    'Loading': '読み込み中',
    'Loading...': '読み込み中...',
    'Connecting': '接続中',
    'Connecting...': '接続中...',
    'Connected': '接続済み',
    'Disconnected': '切断',
    'Error': 'エラー',
    'Warning': '警告',
    'Info': '情報',
    'Success': '成功',
    // ダイアログ
    'OK': 'OK',
    'Yes': 'はい',
    'No': 'いいえ',
    'Confirm': '確認',
    'Are you sure?': 'よろしいですか？',
    // コード関連
    'Run': '実行',
    'Run code': 'コードを実行',
    'Apply': '適用',
    'Apply changes': '変更を適用',
    'Accept': '承認',
    'Reject': '拒否',
    'Approve': '承認',
    'Deny': '拒否',
    // その他
    'Search': '検索',
    'Search...': '検索...',
    'Filter': 'フィルター',
    'Sort': '並べ替え',
    'Refresh': '更新',
    'More': 'その他',
    'Less': '折りたたむ',
    'Show more': 'もっと表示',
    'Show less': '折りたたむ',
    'Expand': '展開',
    'Collapse': '折りたたむ',
    'Back': '戻る',
    'Next': '次へ',
    'Previous': '前へ',
    'Done': '完了',
    'Finish': '終了',
    'Help': 'ヘルプ',
    'Feedback': 'フィードバック',
    'Documentation': 'ドキュメント',
    'Keyboard shortcuts': 'キーボードショートカット',
    'Keyboard Shortcuts': 'キーボードショートカット',
    'What can I help you with?': 'お手伝いできることはありますか？',
    'Ask anything': '何でも聞いてください',
    'No results found': '結果が見つかりませんでした',
    'No results': '結果なし',
    'Try again': 'もう一度お試しください',
    'Learn more': '詳細',
    'Getting started': 'はじめに',
    'Welcome': 'ようこそ',
    'Explore': '探索',
};
// テキストノードの翻訳を行う関数
function translateTextNode(node) {
    if (node.nodeType === 3) { // TEXT_NODE
        const text = node.textContent?.trim();
        if (text && JA_TRANSLATIONS[text]) {
            node.textContent = node.textContent.replace(text, JA_TRANSLATIONS[text]);
        }
    }
}
// placeholder, title, aria-label 等の属性を翻訳する関数
function translateAttributes(el) {
    const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
    for (const attr of attrs) {
        const val = el.getAttribute?.(attr);
        if (val && JA_TRANSLATIONS[val]) {
            el.setAttribute(attr, JA_TRANSLATIONS[val]);
        }
    }
}
// 要素とその子孫を再帰的に翻訳する関数
function translateElement(el) {
    if (!el) return;
    // テキストノードを翻訳
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
        translateTextNode(node);
    }
    // 属性を翻訳
    if (el.querySelectorAll) {
        const allElements = el.querySelectorAll('*');
        for (const child of allElements) {
            translateAttributes(child);
        }
        translateAttributes(el);
    }
}
// DOMContentLoaded後にMutationObserverを起動
window.addEventListener('DOMContentLoaded', () => {
    // 初回翻訳
    translateElement(document.body);
    // DOMの変更を監視して動的に翻訳
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const added of mutation.addedNodes) {
                    if (added.nodeType === 1) { // ELEMENT_NODE
                        translateElement(added);
                    } else if (added.nodeType === 3) { // TEXT_NODE
                        translateTextNode(added);
                    }
                }
            } else if (mutation.type === 'characterData') {
                translateTextNode(mutation.target);
            }
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
});
