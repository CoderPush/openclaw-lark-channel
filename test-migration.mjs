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

// Test 1: Simple text
const res = await client.im.v1.message.create({
  params: { receive_id_type: 'chat_id' },
  data: {
    receive_id: chatId,
    msg_type: 'text',
    content: JSON.stringify({ text: '🧪 Migration Test: NEW Lark plugin is LIVE! (' + new Date().toISOString() + ')' }),
  },
});
console.log('Text:', res?.data?.message_id ? '✅ SUCCESS' : '❌ FAILED');

// Test 2: Interactive card
const card = {
  config: { wide_screen_mode: true },
  header: {
    title: { tag: 'plain_text', content: '🧪 Lark Channel Migration Complete' },
    template: 'green'
  },
  elements: [
    { tag: 'markdown', content: '**The NEW native Lark channel plugin is now active!**\n\n✅ Old bridge stopped\n✅ New plugin bound to port 3000\n✅ Outbound messages working\n\n**Testing checklist:**\n- [ ] Inbound text\n- [ ] Inbound image\n- [ ] Inbound file\n- [ ] Slash commands\n- [ ] Usage footer\n- [ ] Verbose mode' }
  ]
};

const res2 = await client.im.v1.message.create({
  params: { receive_id_type: 'chat_id' },
  data: {
    receive_id: chatId,
    msg_type: 'interactive',
    content: JSON.stringify(card),
  },
});
console.log('Card:', res2?.data?.message_id ? '✅ SUCCESS' : '❌ FAILED');
