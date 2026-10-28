export type PersonToNotify = {
  id: string;
  name: string;
  relation: string;
  circle: string;
  contact: string;
  message: string;
};

export type PersonalLetter = {
  id: string;
  recipient: string;
  relation: string;
  contact: string;
  content: string;
};

export type KeepsakeItem = {
  id: string;
  itemName: string;
  recipient: string;
  contact: string;
  note: string;
};

export type NotebookData = {
  prologue: {
    openingWords: string;
  };
  portrait: {
    photoClue: string;
    selfWords: string;
    favorites: string;
  };
  farewell: {
    medicalDignity: string;
    atmosphere: string;
    taboos: string;
    restingPlace: string;
    missedCeremonyNote: string;
  };
  people: PersonToNotify[];
  letters: {
    worldFarewell: string;
    finalMomentPost: string;
    items: PersonalLetter[];
  };
  belongings: {
    items: KeepsakeItem[];
    privateCleanup: string;
  };
  clues: {
    debtsAndFavors: string;
    assetClues: string;
    digitalClues: string;
  };
};

export type TrustedPerson = {
  slot: 0 | 1;
  name: string;
  relation: string;
  contact: string;
  secretMemory: string;
  confirmedPassing: boolean;
  confirmedAt?: string;
  pausedAt?: string;
  pauseReason?: string;
};

export type WatchStage =
  | "QUIET_WRITING"
  | "PEACEFUL_WATCH"
  | "SELF_STAGE_1"
  | "SELF_STAGE_2"
  | "SELF_STAGE_3"
  | "DUAL_CONFIRMING"
  | "ENTRUSTED_OPEN";

export type WatchSettings = {
  intervalDays: number;
  stage: WatchStage;
  vacationPaused: boolean;
  pausedNote?: string;
};

export const DEFAULT_PROLOGUE =
  "致我最信任的你们俩：\n\n以前一直没跟你们提过这里，是因为在平平安安的日子里说这些太早，怕给你们添堵，也怕你们多想。\n\n今天你们能经过确认看到这本手记，说明我已经先走一步了。之所以把下面这一切毫无保留地敞开交给你们两个人，是因为在这世上，我最信得过你们的为人、审美与分寸。\n\n如果世俗的告别仪式还没办，请尽量按我喜欢的方式来；如果你们看到时葬礼已经办过了，也没关系，至少你们知道了我真正的心意，请再帮我做完剩下的事——替我通知那些散落在各处的朋友，替我把没说出口的话带到。辛苦你们，替我体面地走完这一程。";

export function emptyNotebook(): NotebookData {
  return {
    prologue: {
      openingWords: DEFAULT_PROLOGUE,
    },
    portrait: {
      photoClue: "",
      selfWords: "",
      favorites: "",
    },
    farewell: {
      medicalDignity: "",
      atmosphere: "",
      taboos: "",
      restingPlace: "",
      missedCeremonyNote: "",
    },
    people: [],
    letters: {
      worldFarewell: "",
      finalMomentPost: "",
      items: [],
    },
    belongings: {
      items: [],
      privateCleanup: "",
    },
    clues: {
      debtsAndFavors: "",
      assetClues: "",
      digitalClues: "",
    },
  };
}

export function sample40Notebook(): NotebookData {
  return {
    prologue: {
      openingWords: DEFAULT_PROLOGUE,
    },
    portrait: {
      photoClue:
        "千万别用我身份证或工作证上那张呆板的证件照。我手机相册「收藏」相簿里，有一张 2024 年秋天在川西新都桥拍的侧脸笑得很舒展的照片（穿深灰冲锋衣那张），原图在书房电脑桌面「留影」文件夹里也有。如果要选照片，请一定用这一张。",
      selfWords:
        "别念那种“某同志一生勤恳、忠厚老实”的公文悼词。如果非要总结我这四十年：我认真工作过，用力爱过家人，跟几个知心朋友喝过很多场痛快的酒，去过一些喜欢的山海。虽然也有过遗憾和笨拙，但这一趟人间，我玩得很尽兴。",
      favorites:
        "最爱的歌：李宗盛《山丘》、朴树《平凡之路》、坂本龙一《Merry Christmas Mr. Lawrence》\n最爱的酒：泥煤味重一点的威士忌（泰斯卡 10 年）\n最喜欢的季节：北京十月中旬的秋天\n以后你们想我的时候，倒一小杯酒，听听这几首歌，就算我们又见了一面。",
    },
    farewell: {
      medicalDignity:
        "如果有一天我到了不可逆转的弥留之际（如脑死亡或晚期毫无意义的维持），请千万不要给我做创伤性的气管切开、全身插管和反复电击。让我干干净净、平静体面、少受罪地离开。",
      atmosphere:
        "我想要一场安静、温暖、像老朋友周末聚会一样的告别。现场不要黑纱白布，多放些向日葵、白桔梗和尤加利叶。背景音乐就循环放我上面写的那几首歌。如果可以，给我穿那件洗得最舒服的深蓝色亚麻衬衫。",
      taboos:
        "1. 绝对不要请哭丧队、不要吹拉弹唱的嘈杂乐队；\n2. 不要披麻戴孝、磕头烧大堆纸扎；\n3. 不必叫不熟的客套关系来走过场，只请真正懂我、在乎我的人。",
      restingPlace:
        "我不喜欢逼仄阴冷的传统墓园水泥格。如果家人同意，我更希望树葬或海葬，或者把骨灰撒在可以看到大海的地方。",
      missedCeremonyNote:
        "如果你们看到这份手记时，家里人已经按传统办完了葬礼，千万别自责。请你们俩挑一个天气好的周末傍晚，叫上名单里的几个真朋友，找个安静的小酒馆或院子，帮我留把空椅子、倒杯酒，大家聊聊我以前干过的蠢事和趣事，那才是真正属于我的告别式。",
    },
    people: [
      {
        id: "sample-p1",
        name: "陈默（老陈）",
        relation: "大学睡我上铺的兄弟，认识二十二年",
        circle: "大学 402 寝室及当年乐队的那帮老伙计",
        contact: "微信号 chenmo_1986 / 手机 138-0000-0000",
        message:
          "老陈，我先走一步了。帮我跟 402 的兄弟们说一声，当年在天台喝啤酒吹过的牛，我都还记得。下辈子咱们还做室友。",
      },
      {
        id: "sample-p2",
        name: "林远",
        relation: "三十岁那年一起创业的搭档",
        contact: "手机 139-0000-0000",
        circle: "以前老团队的几位核心伙伴",
        message:
          "远哥，没能赴约今年冬天的崇礼滑雪，抱歉啦。很高兴人生最拼的那几年是和你并肩作战。",
      },
    ],
    letters: {
      worldFarewell:
        "人间晃荡数十载，见过春风，淋过暴雨，喝过烈酒，也爱过对的人。不虚此行，诸位慢走，我先散场啦。",
      finalMomentPost:
        "【请帮我在微信朋友圈发最后一条动态】\n配图：那张在海边背影招手的照片\n文案：“各位好朋友，这次我先下车去远方看看啦。不用难过，也不必特意奔波，有空抬头看看晚霞，那就是我在跟你们打招呼。这一生能认识你们，我很开心。再见啦。”",
      items: [
        {
          id: "sample-l1",
          recipient: "妻子 · 林夏",
          relation: "伴侣",
          contact: "家里人",
          content:
            "夏夏，对不起，说好要陪你到老去大理看苍山洱海，这次我食言了。这十几年辛苦你包容我的坏脾气和忙碌。我走之后，难过一阵子就好，千万别把自己困在过去。去过你喜欢的生活，如果以后遇到能照顾你、让你笑的人，请一定勇敢往前走，那是我最希望看到的事。",
        },
        {
          id: "sample-l2",
          recipient: "孩子 · 小禾",
          relation: "女儿",
          contact: "家里人",
          content:
            "小禾，爸爸最遗憾的是不能亲眼看你满十八岁、看你穿上喜欢的大人衣服去闯世界。但你要记住，不管爸爸在不在你身边，你永远是爸爸最骄傲的宝贝。以后遇到委屈、或者人生重要的日子，去书房看爸爸给你留的那几封信。勇敢去做你自己喜欢的事，不必讨好任何人。",
        },
      ],
    },
    belongings: {
      items: [
        {
          id: "sample-k1",
          itemName: "书房角落那把马丁木吉他和乐谱本",
          recipient: "老陈（陈默）",
          contact: "微信 chenmo_1986",
          note: "放我家里没人会弹，落灰太可惜了。老陈懂琴，请他带走，偶尔弹一首当年我们常练的歌。",
        },
        {
          id: "sample-k2",
          itemName: "书柜第三层带批注的历史与建筑画册",
          recipient: "师弟周航",
          contact: "微信 zhouhang_arch",
          note: "他一直喜欢这几套绝版画册，留给他做个念想。",
        },
      ],
      privateCleanup:
        "书房书桌右下角带锁的第二个抽屉（钥匙在笔筒底座磁吸处），里面是我年轻时写过的一些旧日记、私人信件和两块旧移动硬盘。那些只属于我个人的过往心事，留着怕父母和家人翻看徒增伤感或误会。请你们俩在整理遗物时，先一步帮我直接彻底销毁，不要拆看，让我体体面面、干干净净地离开。",
    },
    clues: {
      debtsAndFavors:
        "1. 2019 年我家里周转困难时，老同学赵磊曾二话不说借过我 10 万块钱，钱虽然早就还清了，但这份雪中送炭的人情我一直记在心里。如果以后赵磊家里有任何需要帮忙的地方，请家人力所能及地搭把手。\n2. 我目前没有未结清的私人外债。",
      assetClues:
        "1. 保险单线索：我在「招商信诺」和「平安人寿」各有一份定期寿险与意外险，电子保单 PDF 全部保存在我常用邮箱的「保单与家庭保障」星标文件夹里，也在书房黑色文件盒第二格打印了纸质版。\n2. 银行卡与证券账户清单：在黑色文件盒第一格的蓝色笔记本第 1 页，列明了所有银行卡开户行、中信证券账户及住房公积金账户线索。",
      digitalClues:
        "1. 手机与电脑解锁密码线索：由我和夏夏的领证纪念日（6位数字）组成，主密码管理器的恢复主密钥纸条夹在书房《百年孤独》第 100 页。\n2. 社交账号：微信发完那条最后的朋友圈后，请保留微信号不要注销，留给爸妈和孩子偶尔看看以前的照片；各类视频/软件的自动续费可在微信支付「扣费服务」里一键关停。",
    },
  };
}

export function countNotebookSections(n: NotebookData): {
  filledChapters: number;
  totalItems: number;
  summary: {
    prologue: boolean;
    portrait: boolean;
    farewell: boolean;
    people: number;
    letters: number;
    belongings: boolean;
    clues: boolean;
  };
} {
  const prologue = Boolean(n.prologue?.openingWords?.trim());
  const portrait = Boolean(
    n.portrait?.photoClue?.trim() ||
      n.portrait?.selfWords?.trim() ||
      n.portrait?.favorites?.trim(),
  );
  const farewell = Boolean(
    n.farewell?.medicalDignity?.trim() ||
      n.farewell?.atmosphere?.trim() ||
      n.farewell?.taboos?.trim() ||
      n.farewell?.restingPlace?.trim() ||
      n.farewell?.missedCeremonyNote?.trim(),
  );
  const people = Array.isArray(n.people) ? n.people.length : 0;
  const letters =
    (Array.isArray(n.letters?.items) ? n.letters.items.length : 0) +
    (n.letters?.worldFarewell?.trim() ? 1 : 0) +
    (n.letters?.finalMomentPost?.trim() ? 1 : 0);
  const belongings = Boolean(
    (Array.isArray(n.belongings?.items) && n.belongings.items.length > 0) ||
      n.belongings?.privateCleanup?.trim(),
  );
  const clues = Boolean(
    n.clues?.debtsAndFavors?.trim() ||
      n.clues?.assetClues?.trim() ||
      n.clues?.digitalClues?.trim(),
  );

  const filledChapters = [
    portrait,
    farewell,
    people > 0,
    letters > 0,
    belongings,
    clues,
  ].filter(Boolean).length;

  const totalItems =
    (portrait ? 1 : 0) +
    (farewell ? 1 : 0) +
    people +
    letters +
    (Array.isArray(n.belongings?.items) ? n.belongings.items.length : 0) +
    (n.belongings?.privateCleanup?.trim() ? 1 : 0) +
    (clues ? 1 : 0);

  return {
    filledChapters,
    totalItems,
    summary: {
      prologue,
      portrait,
      farewell,
      people,
      letters,
      belongings,
      clues,
    },
  };
}

export const WATCH_STAGE_LABELS: Record<
  WatchStage,
  { badge: string; title: string; desc: string }
> = {
  QUIET_WRITING: {
    badge: "静默书写中",
    title: "手记正在安静书写",
    desc: "平时这里只属于你一个人。写好手记并留下两位托付之人后，即可开启每 14 天的温和问候。",
  },
  PEACEFUL_WATCH: {
    badge: "日常守望 · 今日安好",
    title: "在平平安安的日子里，绝不惊动任何亲友",
    desc: "每 14 天向你本人轻轻问候一次。只要按时回应，两位托付之人不会收到任何消息。",
  },
  SELF_STAGE_1: {
    badge: "本人确认 · 温和问候",
    title: "已满 14 天未回应，正在向你本人发去温和问候",
    desc: "“最近比较忙吗？看到请点一下报个平安。”——轻点即可恢复如常。",
  },
  SELF_STAGE_2: {
    badge: "本人确认 · 多渠道寻找",
    title: "连续多日未回应，正在通过微信、短信与邮件联系你本人",
    desc: "“已连续多日没有收到你的消息，如一切安好请回复一声。”——此时仍未打扰亲友。",
  },
  SELF_STAGE_3: {
    badge: "本人确认 · 最后确认",
    title: "向你本人发出最后一封确认信",
    desc: "“如仍无回音，我们将带着你留下的那段往事，去向两位托付之人核实你的近况。”",
  },
  DUAL_CONFIRMING: {
    badge: "挚友印证中",
    title: "已带着你留下的往事联系两位托付之人",
    desc: "若任一人轻点「他只是暂时不便，先暂停」，手记即继续封存；唯有两人都确认你已离开，手记才会向他们缓缓展开。",
  },
  ENTRUSTED_OPEN: {
    badge: "托付已展开",
    title: "两位托付之人均已确认，手记已向他们毫无保留地敞开",
    desc: "他们将读到你的开篇嘱托与六大篇章全文，替你完成告别心愿、通知远方挚友、转达每一封家书。",
  },
};
