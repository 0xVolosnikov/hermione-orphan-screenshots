# hermione-orphan-screenshots

Плагин для [hermione](https://github.com/gemini-testing/hermione), отслеживающий наличие «потерянных» скриншотов, которые не используются ни одним из тестов.
Подробнее почитать о плагинах можно в [документации](https://github.com/gemini-testing/hermione#plugins).

https://www.npmjs.com/package/hermione-orphan-screenshots

## Установка

```bash
$ npm i --save-dev hermione-orphan-screenshots
```

## Использование

Необходимо подключить плагин в конфиге `hermione`:

```js
module.exports = {
    // ...

    plugins: {
        'hermione-orphan-screenshots': {
            enabled: true, // default true
            autoremove: false, // удалять скриншоты от кейсов, которые уже используют другие скриншоты
            autoremoveAll: false, // удалять все «потерянные» скриншоты
        }
    },

    // ...
};
```
