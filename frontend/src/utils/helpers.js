export const maskInn = (inn) => {
    if (!inn) return 'Не указан';
    if (inn.length < 6) return 'Скрыт';
    return inn.substring(0, 3) + '*****' + inn.substring(inn.length - 2);
}
