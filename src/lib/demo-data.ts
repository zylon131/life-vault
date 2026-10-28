import { VaultPayload } from './crypto';

export const INITIAL_VAULT_PAYLOAD: VaultPayload = {
  version: 1,
  updatedAt: new Date().toISOString(),
  userDisplayName: '陈默',
  messages: [
    {
      id: 'msg-1',
      recipientName: '妈妈',
      recipientContact: '138****0000',
      content:
        '妈，当你看到这封信的时候，我已经去了另一个平静的地方。不要过度自责，也不要在深夜偷偷抹眼泪。这辈子做您的孩子，是我最大的幸运。厨房柜子里我放了常用的降压药说明书，阳台上的绿萝记得每周浇一次水。我的一生很充实，没有遗憾，您一定要平平安安地好好生活。',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      recipientName: '老友张航（大学死党）',
      recipientContact: 'zhanghang@example.com',
      content:
        '兄弟，感谢这十几年一起吹牛、打球和创业的日子。我电脑桌抽屉里有一台复古胶片相机，是留给你的，里面的胶卷洗出来都是我们毕业旅行的照片。帮我照顾好自己，少熬夜，以后路过我家老街面馆，替我再去吃一碗加蛋的牛肉面。',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg-3',
      recipientName: '林薇（生命中的特别感谢）',
      recipientContact: 'linwei@example.com',
      content:
        '有些话活着的时候太骄傲一直没能当面说出口。谢谢你曾经出现在我的青春里，给过我最热烈的鼓励与温暖。愿你往后余生，所遇皆良人，眼里永远有光。',
      createdAt: new Date().toISOString(),
    },
  ],
  funeral: {
    bgmTitle: '送别 (Orchestral Instrumental)',
    bgmArtist: '李叔同 / 纯音乐版',
    bgmLink: 'https://music.163.com/#/song?id=188555',
    dressingPreference: '请给我穿那件深蓝色的羊绒毛衣和平底球鞋。不要化浓妆，自然安静就好。',
    burialPreference: '生态树葬或骨灰撒入大海。不设墓碑，不收任何抚恤礼金，不要让亲友在灵堂哭闹。',
    petArrangement: '家里的橘猫“布丁”已经委托给发小张航领养，猫粮猫砂备用金放在书房信封里。',
    digitalLegacyAction: '格式化所有外接固态硬盘；微信与知乎账号在通知完重要好友后申请注销。',
    customWords: '“我曾认真地爱过这个世界，如今我只是提前离席，诸位尽兴，请勿悲伤。”',
  },
  friendsToNotify: [
    {
      id: 'fr-1',
      name: '王晨 (高中老班长)',
      relation: '高中同学',
      phoneOrEmail: '139****1122',
      noticeMessage: '麻烦告知高三(1)班同学们，陈默已安详离世，感谢大家当年的照顾与情谊。',
    },
    {
      id: 'fr-2',
      name: '刘总 (前创业合伙人)',
      relation: '前同事/合伙人',
      phoneOrEmail: 'liuzong@techstartup.com',
      noticeMessage: '当年并肩作战的时光是我最珍贵的回忆，所有业务与交接已无遗留，祝项目顺利！',
    },
    {
      id: 'fr-3',
      name: '周老师 (大学导师)',
      relation: '恩师',
      phoneOrEmail: 'prof_zhou@univ.edu.cn',
      noticeMessage: '受业学生陈默拜谢恩师多年教诲，学生未能再当面请益，愿老师保重身体！',
    },
  ],
};
