# Lang

Aplicativo React Native com Expo para aprendizagem de idiomas por niveis, subniveis, conjuntos de exercicios e exercicios tipados.

## Como rodar

1. Instale as dependencias com `npm install`
2. Configure `EXPO_PUBLIC_API_BASE_URL` no `.env`
3. Rode o projeto com `npx expo start`

## Fluxo de conteudo

```txt
Nivel -> Subnivel -> ExerciseSet -> Exercise -> Card
```

O app busca conjuntos de exercicios por subnivel:

```http
GET /exercise-sets/?sublevel=<uuid>
```

E depois busca exercicios pendentes do conjunto:

```http
GET /exercises/?exercise_set=<uuid>
```

Quando o usuario conclui um exercicio:

```http
POST /exercises/<id>/complete/
```

Quando o usuario sai antes de concluir o conjunto:

```http
POST /exercise-sets/<id>/reset/
```

## JSON de ExerciseSet

```json
{
  "id": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "sublevel": "09595052-63b9-46d6-97af-30990b86b508",
  "sublevel_detail": {
    "id": "09595052-63b9-46d6-97af-30990b86b508",
    "nome": "Saudacoes e o Alfabeto",
    "ordem": 1,
    "is_active": true
  },
  "title": "Nivel 1",
  "description": "Essa e uma breve descricao",
  "order": 0,
  "is_active": true,
  "is_completed": false,
  "progress": {
    "status": "not_started",
    "completed_count": 0,
    "total_count": 4,
    "completed_at": null
  }
}
```

`progress.status` pode ser:

```txt
not_started
in_progress
completed
```

## Estrutura base de Exercise

Todo exercicio deve ter esta base:

```json
{
  "id": 1,
  "exercise_set": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "card": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
  "card_detail": {
    "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "english_name": "Hello",
    "international_name": "Ola",
    "audio": "http://localhost:8000/media/cards/audios/hello.mp3",
    "is_active": true
  },
  "type": "just_audio",
  "prompt": {},
  "options": {},
  "answer_config": {},
  "is_active": true,
  "difficulty": 1,
  "order": 0
}
```

Campos principais:

- `type`: define qual componente/tela o app renderiza.
- `card_detail`: contem o conteudo base, como ingles, traducao e audio.
- `prompt`: define o que aparece/toca para o usuario.
- `options`: define alternativas quando o exercicio precisa.
- `answer_config`: define resposta correta ou regras de validacao.

## Tipos de exercicio

### `just_audio`

Exercicio de apresentacao. Mostra a palavra/frase em ingles, toca o audio, mostra a traducao e o usuario toca em `Proximo`.

```json
{
  "id": 1,
  "exercise_set": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "card": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
  "card_detail": {
    "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "english_name": "Hello",
    "international_name": "Ola",
    "audio": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "type": "just_audio",
  "prompt": {
    "text": "Hello",
    "audio_url": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "options": {},
  "answer_config": {
    "translation": "Ola"
  },
  "is_active": true,
  "difficulty": 1,
  "order": 0
}
```

Fallbacks aceitos pelo app:

- texto principal: `card_detail.english_name` ou `prompt.text`
- audio: `prompt.audio_url`, `card_detail.audio_url` ou `card_detail.audio`
- traducao: `answer_config.translation`, `answer_config.correct_text` ou `card_detail.international_name`

### `multiple_choice_translation`

Exercicio de multipla escolha. Mostra o texto em ingles e o usuario escolhe a traducao correta.

```json
{
  "id": 2,
  "exercise_set": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "card": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
  "card_detail": {
    "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "english_name": "Hello",
    "international_name": "Ola",
    "audio": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "type": "multiple_choice_translation",
  "prompt": {
    "text": "Hello"
  },
  "options": [
    {
      "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
      "text": "Ola"
    },
    {
      "id": "8b67f89d-9c38-43c2-87ee-bb21710b27af",
      "text": "Casa"
    },
    {
      "id": "c260f8e7-f09e-41d7-b7e2-a52d36d742bd",
      "text": "Livro"
    },
    {
      "id": "9e879802-f468-4a04-86e0-42a64b9e6f53",
      "text": "Mesa"
    }
  ],
  "answer_config": {
    "correct_card_id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "correct_text": "Ola"
  },
  "is_active": true,
  "difficulty": 1,
  "order": 1
}
```

Se `options` vier vazio, o app tenta montar alternativas usando outros exercicios carregados do mesmo conjunto.

### `write_translation_from_text_audio`

Exercicio planejado. Mostra texto em ingles, toca audio e o usuario escreve a traducao.

```json
{
  "id": 3,
  "exercise_set": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "card": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
  "card_detail": {
    "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "english_name": "Hello",
    "international_name": "Ola",
    "audio": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "type": "write_translation_from_text_audio",
  "prompt": {
    "text": "Hello",
    "audio_url": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "options": {},
  "answer_config": {
    "correct_text": "Ola",
    "case_sensitive": false,
    "trim": true,
    "accept": ["Ola", "Olá"]
  },
  "is_active": true,
  "difficulty": 1,
  "order": 2
}
```

### `write_translation_from_audio`

Exercicio planejado. O usuario ouve o audio sem texto escrito e digita a resposta.

```json
{
  "id": 4,
  "exercise_set": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "card": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
  "card_detail": {
    "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "english_name": "Hello",
    "international_name": "Ola",
    "audio": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "type": "write_translation_from_audio",
  "prompt": {
    "audio_url": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "options": {},
  "answer_config": {
    "correct_text": "Hello",
    "case_sensitive": false,
    "trim": true
  },
  "is_active": true,
  "difficulty": 2,
  "order": 3
}
```

### `speak_written_text`

Exercicio planejado. Mostra texto e o usuario precisa falar o que esta escrito.

```json
{
  "id": 5,
  "exercise_set": "19fb2ecf-2c2a-4355-a57a-c6c64131b452",
  "card": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
  "card_detail": {
    "id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "english_name": "Hello",
    "international_name": "Ola",
    "audio": "http://localhost:8000/media/cards/audios/hello.mp3"
  },
  "type": "speak_written_text",
  "prompt": {
    "text": "Hello"
  },
  "options": {},
  "answer_config": {
    "expected_transcript": "Hello",
    "language": "en-US"
  },
  "is_active": true,
  "difficulty": 2,
  "order": 4
}
```

## Completar exercicio

O app chama:

```http
POST /exercises/<id>/complete/
```

Exemplo para `just_audio`:

```json
{
  "answer": {},
  "is_correct": true
}
```

Exemplo para multipla escolha:

```json
{
  "answer": {
    "selected_option_id": "ed137265-9863-4b93-ba14-1d2a8dd88bb2",
    "selected_text": "Ola"
  },
  "is_correct": true
}
```

Resposta esperada:

```json
{
  "exercise_completed": true,
  "set_completed": false,
  "status": "in_progress",
  "completed_count": 1,
  "total_count": 4,
  "completed_at": null
}
```

Quando o conjunto terminar:

```json
{
  "exercise_completed": true,
  "set_completed": true,
  "status": "completed",
  "completed_count": 4,
  "total_count": 4,
  "completed_at": "2026-07-02T15:47:05.527099-03:00"
}
```

## Reset ao sair

Se o usuario sair antes de terminar o conjunto, o app chama:

```http
POST /exercise-sets/<id>/reset/
```

Resposta esperada:

```json
{
  "reset": true,
  "deleted_attempts": 2,
  "status": "not_started"
}
```

Se o conjunto ja foi concluido, o backend deve preservar o progresso:

```json
{
  "reset": false,
  "status": "completed",
  "detail": "Conjunto ja concluido; progresso preservado."
}
```
