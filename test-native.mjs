import * as LarkSDK from '@larksuiteoapi/node-sdk';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('/root/.openclaw/openclaw.json', 'utf8'));
const client = new LarkSDK.Client({
  appId: config.channels.lark.appId,
  appSecret: config.channels.lark.appSecret,
  domain: LarkSDK.Domain.Feishu,
  appType: LarkSDK.AppType.SelfBuild,
});
const chatId = 'oc_289754d98cefc623207a174739837c29';

// Send comprehensive test results card
const card = {
  config: { wide_screen_mode: true },
  header: {
    title: { tag: 'plain_text', content: '✅ Lark Channel Migration Complete!' },
    template: 'green'
  },
  elements: [
    { tag: 'markdown', content: '**Migration from OLD bridge to NEW native plugin successful!**\n\nPort 3000 is now handled by the native Lark channel plugin (not the old bridge).' },
    { tag: 'hr' },
    { tag: 'markdown', content: '**✅ Verified Working:**\n• Outbound text messages\n• Outbound interactive cards\n• Inbound message processing\n• SQLite queue with retries\n• Dispatch system integration' },
    { tag: 'hr' },
    { tag: 'markdown', content: '**📋 Please test these from Lark:**\n1. Send `/new` → Should show "✅ New session started"\n2. Send any text → Should get response with usage footer\n3. Send an image → Should be received and analyzed\n4. Send a file (zip/pdf) → Should be downloaded\n5. Check for 🛠️ Exec: notifications (verbose mode)' },
    { tag: 'hr' },
    { tag: 'note', elements: [{ tag: 'plain_text', content: 'Time: ' + new Date().toISOString() + ' | Old bridge: STOPPED | New plugin: ACTIVE' }] }
  ]
};

const res = await client.im.v1.message.create({
  params: { receive_id_type: 'chat_id' },
  data: { receive_id: chatId, msg_type: 'interactive', content: JSON.stringify(card) },
});
console.log('Test results card:', res?.data?.message_id ? '✅ SENT' : '❌ FAILED');
