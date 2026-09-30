# Лица пацанов: кадры-спрайты

## Как это работает в игре

- Тело объёмное, «голова» — картинка, которая всегда повёрнута к игроку, как у врагов в старом Doom.
- На каждое действие — **живой кадр**, как у Кирилла с бутылкой: свой ракурс, руки, предметы (бутылка, вейп, дым, телефон). Не одна и та же голова анфас с разными гримасами.
- Если на кадре есть руки, игра прячет у тела ту руку (или обе), которая на картинке. Кадр можно делать крупнее головы: бутылка и дым могут торчать в стороны.
- **Два кадра на действие = анимация.** Игра чередует их, как в Doom (вдох/выдох вейпа, всхлип/рыдание). Можно начать с одного кадра, второй добавить потом.
- Если нужного кадра нет, показывается обычное лицо. Можно добавлять по одной картинке, ничего не сломается.

## Требования к картинке

- PNG, квадрат 1024×1024, фон чисто белый. Фон вырезаю сам.
- В кадре только голова, шея, кисти и предплечья. Всё ниже шеи обрезано: тело в игре своё.
- Куда поставить картинку относительно шеи, подгоняю сам под каждый кадр. Ракурс и поза могут быть любыми.
- Имя файла: `<кто>_<действие>[_2].png`, например `temych_vape.png` и `temych_vape_2.png`. Кто: `alexey`, `lyokha`, `kirill`, `temych`.

## Промт (на вход — лучшее фото человека или его чистая голова анфас)

Вместо `{ACTION}` подставь сцену из таблицы.

```
Use the person from the reference photo. Keep his identity exactly: face shape, eyes, nose, lips,
eyebrows, skin, moles, hairstyle, hair color, facial hair. Do not beautify, do not change his age.
Scene: {ACTION}
Show only his head, neck, hands and forearms; everything below the neck is cut away.
Photorealistic, like a real photo, soft light.
Plain pure white background, nothing in the frame except him and the props described.
Square image.
```

## Кадры

### Алексей
| Файл | Когда в игре | `{ACTION}` |
|---|---|---|
| `alexey_cry` | плачет | `sobbing with his face buried in both hands, tears on his fingers, only his red wet eyes peek over the fingers` |
| `alexey_cry_2` | плачет | `crying loudly with his head raised, mouth open in a wail, tears streaming down, wiping his nose with the back of his hand` |
| `alexey_hog` | присосался к бутылке | `chugging vodka straight from the bottle, head thrown far back, the bottle held upside down at his lips, eyes shut` |
| `alexey_hog_2` | присосался к бутылке | `lowering the vodka bottle from his lips with a satisfied grimace, cheeks puffed, eyes watering` |

### Лёха
| Файл | Когда в игре | `{ACTION}` |
|---|---|---|
| `lyokha_puke` | блюёт | `about to vomit, one hand clamped over his mouth, cheeks puffed out, greenish sweaty face, eyes bulging` |
| `lyokha_puke_2` | блюёт | `leaning forward retching with his mouth open, eyes squeezed shut, one hand on his stomach area at the bottom of the frame` |
| `lyokha_sleep` | вырубился в ванне | `passed out with his head lying on its side on his folded arm, mouth open, drooling, eyes closed` |
| `lyokha_rage` | громит хату | `screaming in drunken rage, holding a broken chair leg up next to his face, veins on the forehead` |
| `lyokha_rage_2` | громит хату | `swinging the broken chair leg sideways, face twisted, hair messy, mouth open yelling` |
| `lyokha_drink` | пьёт | `drinking beer from a brown glass bottle, head tilted back, the bottle held to his lips by one hand` |

### Кирилл
| Файл | Когда в игре | `{ACTION}` |
|---|---|---|
| `kirill_choke` | задыхается в дыму на балконе | `coughing into his fist, eyes watering, waving away thick grey smoke with his other hand` |
| `kirill_choke_2` | задыхается в дыму | `face half hidden in grey smoke, both hands covering his mouth and nose, eyes squeezed` |
| `kirill_grill` | раздувает мангал | `fanning with a flat piece of cardboard, holding a metal skewer with meat, squinting from the heat` |
| `kirill_sleep` | уснул под аниме | `fell asleep with his head tilted back and mouth open, a phone with a bright anime screen slipping from his hand near his face` |
| `kirill_drink` | пьёт | уже есть |

### Темыч
| Файл | Когда в игре | `{ACTION}` |
|---|---|---|
| `temych_vape` | парит | `inhaling from a small vape device held to his lips, eyes closed, cheeks slightly drawn in` |
| `temych_vape_2` | парит | `exhaling a huge thick cloud of white vape vapor, the vape in his hand, eyes half-closed and relaxed` |
| `temych_cough` | закашлялся | `coughing violently into his fist, eyes squeezed shut, red face, a puff of white vapor` |
| `temych_cough_2` | закашлялся | `bent forward mid-cough, mouth wide open, one hand on his chest area at the bottom of the frame` |
| `temych_shout` | орёт «сукааа» | `shouting at the ceiling with his head thrown back, both hands grabbing his hair, mouth wide open` |
| `temych_drink` | пьёт | `drinking beer from a brown glass bottle, head tilted back, the bottle held to his lips by one hand` |

### Всем, по желанию
| Файл | Когда в игре | `{ACTION}` |
|---|---|---|
| `<кто>_toilet` | ждёт туалет | `desperately needs the toilet, biting his lip, sweaty forehead, one hand pressed to his forehead` |
| `<кто>_drunk` | сильно пьяный | `very drunk, eyes unfocused, red cheeks, lopsided grin, holding up a shot glass unsteadily` |
| `<кто>_happy` | ржёт | `laughing out loud and pointing a finger at the viewer` |
| `<кто>_talk` | Олег с ним трещит | `telling a story with animated hand gestures, eyebrows raised` |

## Очерёдность (не всё сразу)

1. **Обычное лицо каждому.** Без него некуда подставлять остальные кадры.
2. **По одному кадру на фирменную проблему:** `alexey_cry`, `alexey_hog`, `lyokha_puke`, `lyokha_sleep`, `lyokha_rage`, `kirill_choke`, `kirill_sleep`, `temych_vape`, `temych_cough`, `temych_shout`. После этого уже всё живое.
3. **Вторые кадры** (`_2`): анимация для плача, блевоты, вейпа, кашля, погрома.
4. **Всё остальное:** пьют, ржут, терпят туалет.
