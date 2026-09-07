/**
 * Строки дашборда вынесены из основных словарей намеренно.
 *
 * ru.ts, en.ts и uz.ts уже большие, и правка сразу трёх файлов при каждом
 * новом экране — источник ошибок: раздел добавляется в один язык, забывается
 * в двух других, и сборка падает на несоответствии типу словаря.
 * Именно так я сломал ветку при добавлении складского раздела.
 *
 * Здесь три языка лежат рядом, и typeof привязывает два остальных к русскому.
 * Забыть перевод физически труднее.
 */

export const dashRu = {
  products: 'Товаров в каталоге',
  variantsHint: 'Вариантов: {{n}}',
  stockUnits: 'Штук на складах',
  warehousesHint: 'Складов: {{n}}',
  stockCost: 'Себестоимость запасов',
  stockCostHint: 'Остаток, умноженный на закупочную цену',
  movements: 'Движений за 7 дней',
  movementsHint: 'Приход {{in}} · расход {{out}}',
  attention: 'Требует внимания',
  negative: 'Позиций в минусе',
  negativeHint: 'Списано больше, чем принято. Проверьте приёмку.',
  noStock: 'Товаров без остатка',
  noStockHint: 'Закончились или ещё не приняты на склад',
  startTitle: 'С чего начать',
  startBody: 'Система пока пуста. Три шага, и появятся первые цифры.',
  step1: 'Заведите категории и бренды в справочниках',
  step2: 'Добавьте первый товар с артикулом',
  step3: 'Создайте склад и проведите приёмку',
  nextTitle: 'Чего здесь пока нет',
  nextBody:
    'Выручка, заказы и график продаж появятся после подключения маркетплейсов. Пока площадки не подключены, показывать эти цифры не из чего.',
}

export const dashEn: typeof dashRu = {
  products: 'Products in catalog',
  variantsHint: 'Variants: {{n}}',
  stockUnits: 'Units in stock',
  warehousesHint: 'Warehouses: {{n}}',
  stockCost: 'Stock value at cost',
  stockCostHint: 'Quantity multiplied by purchase price',
  movements: 'Movements in 7 days',
  movementsHint: 'In {{in}} · out {{out}}',
  attention: 'Needs attention',
  negative: 'Positions below zero',
  negativeHint: 'More written off than received. Check the receipts.',
  noStock: 'Products with no stock',
  noStockHint: 'Sold out or never received',
  startTitle: 'Where to start',
  startBody: 'The system is still empty. Three steps and the first numbers appear.',
  step1: 'Create categories and brands in the reference lists',
  step2: 'Add your first product with an SKU',
  step3: 'Create a warehouse and post a receipt',
  nextTitle: 'What is not here yet',
  nextBody:
    'Revenue, orders and the sales chart appear once marketplaces are connected. Until then there is nothing to compute them from.',
}

export const dashUz: typeof dashRu = {
  products: 'Katalogdagi mahsulotlar',
  variantsHint: 'Variantlar: {{n}}',
  stockUnits: 'Omborlardagi dona',
  warehousesHint: 'Omborlar: {{n}}',
  stockCost: 'Zaxira tannarxi',
  stockCostHint: 'Qoldiq xarid narxiga ko‘paytirilgan',
  movements: '7 kunlik harakatlar',
  movementsHint: 'Kirim {{in}} · chiqim {{out}}',
  attention: 'E’tibor talab qiladi',
  negative: 'Manfiy pozitsiyalar',
  negativeHint: 'Qabuldan ko‘proq chiqarilgan. Qabulni tekshiring.',
  noStock: 'Qoldiqsiz mahsulotlar',
  noStockHint: 'Tugagan yoki hali qabul qilinmagan',
  startTitle: 'Nimadan boshlash kerak',
  startBody: 'Tizim hozircha bo‘sh. Uch qadam — va birinchi raqamlar paydo bo‘ladi.',
  step1: 'Ma’lumotnomalarda toifa va brendlarni yarating',
  step2: 'Artikuli bilan birinchi mahsulotni qo‘shing',
  step3: 'Ombor yarating va qabulni o‘tkazing',
  nextTitle: 'Bu yerda hozircha nima yo‘q',
  nextBody:
    'Tushum, buyurtmalar va sotuv grafigi maydonchalar ulangach paydo bo‘ladi. Ulanmagunicha bu raqamlarni hisoblash uchun manba yo‘q.',
}
