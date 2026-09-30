# Лица пацанов

## Как это работает в игре

- Стиль: объёмное тело и плоская голова-картинка, всегда повёрнутая к игроку, как в старом Doom.
- Анимация не покадровая. На каждое состояние нужна **одна картинка лица**. Игра подменяет её, когда у пацана что-то происходит, и сама двигает голову: при плаче всхлипывает, при кашле дёргается, во сне клюёт носом, когда орёт — трясётся.
- Если какой-то картинки нет, показывается обычное лицо (`neutral`). Поэтому можно добавлять по одной, ничего не сломается.

## Порядок работы в Qwen

1. **База.** Из фотки делаем чистую голову анфас (промт 1). Это `<кто>_neutral`.
2. **Состояния делаем из базы, а не из исходного фото** (промт 2). Тогда у всех картинок одного человека совпадут размер, положение головы и свет, и голова не будет прыгать при смене выражения.

## Требования к картинке

- PNG, квадрат 1024×1024.
- Только голова и шея, обрез по шее, как на примере. Без плеч и одежды.
- Анфас, голова по центру. Волосы почти у верхнего края, шея у нижнего. На всех картинках одного человека одинаково.
- Фон чисто белый. Фон вырезаю сам.
- Имя файла: `<кто>_<состояние>.png`. Кто: `alexey`, `lyokha`, `kirill`, `temych`, `oleg`. Например `lyokha_puke.png`.

## Промт 1: базовая голова (на вход — фото человека)

```
Recreate this person as a clean front-facing head portrait. Show only the head and neck,
cut off smoothly at the neck like a mannequin bust, no shoulders, no clothing.
He looks straight into the camera, head level and centered, neutral relaxed expression, eyes open.
Keep his identity exactly: face shape, eyes, nose, lips, eyebrows, skin texture, moles,
hairstyle, hair color and length, facial hair. Do not beautify, do not change his age.
Photorealistic, soft even studio lighting. Plain pure white background.
Square image, the head fills about 85% of the height, top of the hair near the top edge.
```

## Промт 2: состояние (на вход — база из промта 1)

Вместо `{STATE}` подставь фразу из таблицы ниже.

```
Keep this exact image composition: same person, same head size and position, same neck cut,
same hairstyle, same lighting, same pure white background.
Change only the facial expression: {STATE}.
Photorealistic, no text, no extra objects unless described.
```

## Какие состояния нужны

| Файл | Кому | Когда в игре | `{STATE}` |
|---|---|---|---|
| `_neutral` | всем | обычное | (это база из промта 1) |
| `_cry` | Алексей | плачет, надо погладить или обнять | `crying like a child, tears streaming down his cheeks, red wet eyes, eyebrows raised in the middle, mouth open in a sob` |
| `_puke` | Лёха | блюёт | `about to throw up, cheeks puffed out, lips pressed shut, pale greenish sweaty skin, eyes wide open` |
| `_sleep` | Лёха, Кирилл | вырубился в ванне / уснул под аниме | `fast asleep, eyes closed, mouth slightly open, a little drool, head tilted to one side` |
| `_rage` | Лёха | громит хату | `furious drunk yelling, mouth wide open, eyebrows pulled down, red face, veins on the forehead` |
| `_choke` | Кирилл | задыхается в дыму на балконе | `choking on thick grill smoke, coughing, eyes squeezed and watering, red face, grey smoke drifting around his face` |
| `_vape` | Темыч | парит | `exhaling a big thick cloud of white vape vapor from his mouth, relaxed half-closed eyes` |
| `_cough` | Темыч | закашлялся от вейпа | `coughing hard, eyes shut, mouth open, tense red face, a small puff of white vapor coming out of the mouth` |
| `_shout` | Темыч | орёт «сукааа» | `shouting at the top of his lungs with his head thrown slightly back, mouth wide open, eyes squeezed shut` |
| `_drink` | всем | пьёт (у Кирилла уже есть) | `drinking beer straight from a brown glass bottle, head tilted back, eyes half-closed, his hand holds the bottle to his lips, the bottle and the hand stick out to the left side of the image; the head stays in the same place` |
| `_drunk` | всем | сильно пьяный | `very drunk, eyes half-closed and unfocused, flushed red cheeks and nose, silly lopsided grin, head slightly tilted` |
| `_happy` | всем | веселье высокое, ржёт | `laughing out loud, mouth open, eyes squinted, big genuine smile` |
| `_sad` | всем | веселье на дне | `bored and sulky, droopy eyelids, mouth corners down, looking to the side` |
| `_toilet` | всем | ждёт туалет | `desperately needs the toilet, strained face, lips pressed tight, eyes wide, sweating` |

`_drink` — единственная картинка, где в кадре есть рука и бутылка.

## Очерёдность (не всё сразу)

1. **Базы (4 шт.):** `neutral` каждому. Уже после этого пацаны узнаваемые.
2. **Фирменные проблемы (9 шт.):** по ним Олег с одного взгляда понимает, что с кем. `alexey_cry`, `lyokha_puke`, `lyokha_sleep`, `lyokha_rage`, `kirill_choke`, `kirill_sleep`, `temych_vape`, `temych_cough`, `temych_shout`.
3. **Бухают (3 шт.):** `alexey_drink`, `lyokha_drink`, `temych_drink`.
4. **По желанию (16 шт.):** `drunk`, `happy`, `sad`, `toilet` каждому.

Минимум для нормальной игры — этапы 1–3, всего 16 картинок.
