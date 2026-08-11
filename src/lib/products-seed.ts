import type { Product } from "./products";

/**
 * Стартовый каталог. Товары живут в Postgres и правятся из админки;
 * этот массив разливается в пустую таблицу при первом обращении и
 * дальше не участвует — источником правды становится база.
 */
export const SEED_PRODUCTS: Product[] = [
  {
    id: "longsleeve-crescent",
    house: "visual",
    name: { ru: "Лонгслив Crescent", en: "Crescent Longsleeve" },
    tagline: {
      ru: "Бордо с хромовым полумесяцем",
      en: "Merlot with a chrome crescent",
    },
    description: {
      ru: "Лонгслив цвета выдержанного вина: V-вырез, хромовый полумесяц на груди. Плотный гладкий трикотаж держит форму и не вытягивается на локтях. Сидит близко к телу, но не сковывает.",
      en: "A longsleeve the colour of aged wine: V-neck, chrome crescent at the chest. Dense, smooth jersey that holds its shape and never bags at the elbows. Sits close to the body without gripping it.",
    },
    composition: {
      ru: "95% хлопок, 5% эластан. Стирать при 30°, гладить с изнанки, печать не тереть.",
      en: "95% cotton, 5% elastane. Wash at 30°, iron inside out, do not rub the print.",
    },
    priceRub: 6400,
    priceUsd: 69,
    image: "/products/longsleeve-crescent.png",
    sizes: ["XS", "S", "M", "L", "XL"],
    video: null,
    featured: true,
    imageStyle: "cutout",
  },
  {
    id: "cap-drape",
    house: "visual",
    name: { ru: "Кепка Drape", en: "Drape Cap" },
    tagline: {
      ru: "Стираный деним со съёмным шлейфом",
      en: "Washed denim with a detachable drape",
    },
    description: {
      ru: "Шестипанельная кепка из стираного денима. Шлейф на пуговицах закрывает шею от солнца — или отстёгивается за секунду. Рваный край режем вручную, поэтому двух одинаковых кепок нет.",
      en: "A six-panel cap in washed denim. The button-on drape shades the neck from the sun — or comes off in a second. We fray the edge by hand, so no two caps are alike.",
    },
    composition: {
      ru: "100% хлопковый деним. Стирать вручную, сушить в тени.",
      en: "100% cotton denim. Hand wash, dry in the shade.",
    },
    priceRub: 5900,
    priceUsd: 64,
    image: "/products/cap-drape.png",
    sizes: null,
    video: null,
    featured: true,
    imageStyle: "cutout",
  },
  {
    id: "belt-serpent",
    house: "visual",
    name: { ru: "Ремень Serpent", en: "Serpent Belt" },
    tagline: {
      ru: "Бордовая кожа под питона, гравированная пряжка",
      en: "Merlot python-embossed leather, engraved buckle",
    },
    description: {
      ru: "Кожа с тиснением под питона, глубокий бордовый. Литая пряжка-вестерн: цветочная гравировка, состаренное серебро. Одинаково спокойно держится с денимом и поверх пальто.",
      en: "Python-embossed leather in deep merlot. A cast western buckle — floral engraving, aged silver. Equally at ease with denim or over a coat.",
    },
    composition: {
      ru: "Натуральная кожа, латунная фурнитура. Протирать сухой тканью, беречь от влаги.",
      en: "Genuine leather, brass hardware. Wipe with a dry cloth, keep away from moisture.",
    },
    priceRub: 8900,
    priceUsd: 96,
    image: "/products/belt-serpent.png",
    sizes: ["80", "85", "90", "95", "100"],
    video: null,
    featured: true,
    imageStyle: "cutout",
  },
  {
    id: "jeans-wash",
    house: "visual",
    name: { ru: "Джинсы Wash", en: "Wash Jeans" },
    tagline: {
      ru: "Стираный чёрный, прямой крой",
      en: "Washed black, straight cut",
    },
    description: {
      ru: "Прямой крой, плотный деним в стираном чёрном. Посадка на талии, длина с лёгким заломом на ботинке. Со временем потёртости становятся глубже — деним запоминает, как вы его носите.",
      en: "A straight cut in dense washed-black denim. Sits at the waist, breaks lightly on the boot. The fade deepens with time — denim remembers how you wear it.",
    },
    composition: {
      ru: "100% хлопок, 14 oz. Стирать вывернутыми при 30°, сушить на воздухе.",
      en: "100% cotton, 14 oz. Wash inside out at 30°, air dry.",
    },
    priceRub: 9800,
    priceUsd: 106,
    image: "/products/jeans-wash.png",
    sizes: ["28", "30", "32", "34", "36"],
    video: null,
    featured: true,
    imageStyle: "cutout",
  },
  {
    id: "jacket-trackside",
    house: "visual",
    name: { ru: "Куртка Trackside", en: "Trackside Jacket" },
    tagline: {
      ru: "Чёрная олимпийка на молнии",
      en: "Black full-zip track jacket",
    },
    description: {
      ru: "Олимпийка на молнии во всю длину: стойка, вязаные манжеты и низ, два кармана в рельефах. Плотный трикотаж держит форму, светлая отстрочка по плечам собирает силуэт. Одинаково ложится поверх лонгслива и на футболку.",
      en: "A full-zip track jacket: stand collar, ribbed cuffs and hem, two seam pockets. Dense knit that holds its shape, pale piping along the shoulders drawing the silhouette. Sits equally well over a longsleeve or straight on a tee.",
    },
    composition: {
      ru: "100% полиэстер. Стирать при 30°, принты не гладить, сушить на воздухе.",
      en: "100% polyester. Wash at 30°, do not iron the prints, air dry.",
    },
    priceRub: 12400,
    priceUsd: 134,
    image: "/products/jacket-trackside.png",
    sizes: ["XS", "S", "M", "L", "XL"],
    video: null,
    featured: false,
    imageStyle: "cutout",
  },
  {
    id: "forma-serum",
    house: "forma",
    name: { ru: "Сыворотка Visage 01", en: "Visage Serum 01" },
    tagline: {
      ru: "Увлажняет · выравнивает · смягчает",
      en: "Hydrates · brightens · smoothes",
    },
    description: {
      ru: "Ежедневная сыворотка для лица. Витамин C выравнивает тон, транексамовая кислота работает с пигментом, пантенол успокаивает. Текстура лёгкая, почти вода — впитывается за минуту и не оставляет плёнки.",
      en: "A daily face serum. Vitamin C evens the tone, tranexamic acid works on pigment, panthenol calms. The texture is light, almost water — gone in a minute, no film left behind.",
    },
    composition: {
      ru: "Aqua, Ascorbyl Glucoside, Tranexamic Acid, Panthenol, Glycerin. Утром и вечером на чистую кожу; днём — обязательно SPF.",
      en: "Aqua, Ascorbyl Glucoside, Tranexamic Acid, Panthenol, Glycerin. Morning and evening on clean skin; SPF by day, always.",
    },
    priceRub: 7200,
    priceUsd: 78,
    image: "/products/forma-serum.png",
    sizes: ["30 ml"],
    video: null,
    featured: true,
    imageStyle: "cutout",
  },
];
