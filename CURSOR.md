# 🧠 PROMPT: `@aranza/commitlens` — AI-Powered Git Quality Pipeline

---

## 📌 Contexto

Existe una necesidad común en equipos de desarrollo de automatizar la revisión y validación de código antes de que llegue al repositorio. Herramientas como Husky permiten ejecutar scripts en git hooks, pero requieren configuración manual de cada paso y no tienen integración nativa con herramientas de AI.

`@aranza/commitlens` es un paquete npm que actúa como un **orquestador de calidad para git hooks**: se instala como `devDependency` en cualquier proyecto JavaScript/TypeScript y permite configurar un pipeline de pasos por hook, donde cada paso puede ser un comando arbitrario (linter, tests, build) o una revisión de AI, con control granular de si cada paso es bloqueante o solo una advertencia.

Es parte del ecosistema de paquetes **AranzaTech** bajo el scope `@aranza`.

---

## 🎯 Objetivo

Crear un paquete npm llamado `@aranza/commitlens` que:

- Se instale como `devDependency` en cualquier proyecto JS/TS
- Instale y gestione git hooks automáticamente (como Husky)
- Permita definir un **pipeline de pasos** por hook (lint, tests, build, AI review, etc.)
- Cada paso tenga control independiente de `blocking: true/false`
- Soporte múltiples proveedores de AI intercambiables via configuración
- Sea configurable por proyecto con un archivo `commitlens.config.ts`
- Sea publicable en npm y reutilizable en N proyectos distintos

---

## 🛠 Tech Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Runtime | Node.js ≥ 18 |
| Build | tsup |
| CLI | CAC |
| Ejecución de procesos | execa |
| Git interaction | simple-git |
| Config loader | jiti (para leer `.config.ts` en runtime) |
| Validación de config | Zod |
| Testing | Vitest |
| Publicación | npm (scope `@aranza`) |

---

## ✅ Requisitos Funcionales

### CLI

| Comando | Descripción |
|---|---|
| `commitlens init` | Genera `commitlens.config.ts` con valores por defecto |
| `commitlens install` | Instala los git hooks en `.git/hooks/` |
| `commitlens run <hook>` | Ejecuta un hook manualmente para testing |
| `commitlens doctor` | Verifica que el provider AI configurado esté disponible |
| `commitlens use <provider>` | Cambia el provider AI activo en la config |

### Hooks Soportados

| Hook | Descripción |
|---|---|
| `pre-commit` | Pipeline antes de crear el commit |
| `pre-push` | Pipeline antes de hacer push al remoto |
| `commit-msg` | Valida el formato del mensaje de commit |

### Pipeline Engine

- Cada hook tiene un array de `steps` que se ejecutan en orden
- Cada step puede ser de tipo `command`, `ai` o `commit-msg`
- Si un step falla y `blocking: true` → `exit 1`, detiene el pipeline completo
- Si un step falla y `blocking: false` → muestra warning, continúa con el siguiente step
- Al finalizar el pipeline, muestra resumen de pasos pasados, advertencias y errores
- Los steps de tipo `command` ejecutan cualquier comando de shell arbitrario
- Los steps de tipo `ai` pasan los archivos staged al provider configurado
- Los steps de tipo `commit-msg` validan el mensaje contra un formato definido

---

## ⚙️ Definición del Archivo de Configuración

```ts
// commitlens.config.ts
import { defineConfig } from '@aranza/commitlens'

export default defineConfig({
  provider: 'claude-code',
  fallback: ['claude-api', 'openai'],

  hooks: {
    'pre-commit': {
      steps: [
        {
          name: 'lint',
          type: 'command',
          run: 'eslint --ext .ts,.tsx src/',
          blocking: false,              // warning, no bloquea el commit
        },
        {
          name: 'format',
          type: 'command',
          run: 'prettier --check src/',
          blocking: false,              // warning, no bloquea el commit
        },
        {
          name: 'ai-review',
          type: 'ai',
          blocking: false,              // warning, no bloquea el commit
          filePatterns: ['*.ts', '*.tsx', '*.js', '*.jsx'],
          prompt: 'Review staged files for bugs and security issues. Reply OK or list issues.',
        }
      ]
    },

    'pre-push': {
      steps: [
        {
          name: 'lint',
          type: 'command',
          run: 'eslint --ext .ts,.tsx src/',
          blocking: true,               // bloquea el push
        },
        {
          name: 'tests',
          type: 'command',
          run: 'vitest run',
          blocking: true,               // bloquea el push
        },
        {
          name: 'build',
          type: 'command',
          run: 'tsup',
          blocking: true,               // bloquea el push
        },
        {
          name: 'ai-review',
          type: 'ai',
          blocking: false,              // solo informa, no bloquea
          promptFile: '.commitlens/pre-push-prompt.md',
        }
      ]
    },

    'commit-msg': {
      steps: [
        {
          name: 'conventional-commits',
          type: 'commit-msg',
          format: 'conventional-commits',
          blocking: false,              // solo warning, no bloquea
        }
      ]
    }
  },

  providers: {
    'claude-code': {
      bin: 'claude',
      allowedTools: ['Read'],
      model: 'claude-sonnet-4-5',
    },
    'claude-api': {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-5',
    },
    'openai': {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'o4-mini',
    },
    'custom': {
      script: '.commitlens/my-reviewer.sh',
    }
  }
})
```

---

## 🤖 Providers de AI Soportados

Cada provider implementa la misma interfaz `AIProvider`:

```ts
interface AIProvider {
  name: string
  isAvailable(): Promise<boolean>
  review(input: ReviewInput): Promise<ReviewResult>
}

interface ReviewInput {
  files: string[]
  prompt: string
  diff?: string
}

interface ReviewResult {
  passed: boolean
  message: string
  issues?: string[]
}
```

### Tabla de Providers

| Provider | Mecanismo | Config requerida |
|---|---|---|
| `claude-code` | CLI subprocess (`claude --print`) | Binary `claude` en PATH |
| `claude-api` | HTTP a `api.anthropic.com` | `ANTHROPIC_API_KEY` |
| `codex` | CLI subprocess (`codex`) | Binary `codex` en PATH |
| `cursor` | CLI subprocess (`cursor`) | Binary `cursor` en PATH |
| `openai` | HTTP a `api.openai.com` | `OPENAI_API_KEY` |
| `custom` | Script definido por el usuario | Path al script |

**Fallback automático**: si el provider principal no está disponible, el sistema intenta los providers en el array `fallback[]` en orden.

---

## 🖥 Output Esperado en Consola

### Commit exitoso con warnings

```bash
git commit -m "fix stuff"

[commitlens] Running pre-commit pipeline...

  ✅ lint                passed
  ⚠️  format             warning → 3 files need formatting (non-blocking)
  ⚠️  ai-review          warning → Possible null pointer in auth.service.ts (non-blocking)

[commitlens] Running commit-msg...

  ⚠️  conventional-commits → "fix stuff" doesn't follow convention (non-blocking)

✅ Commit created (3 warnings)
```

### Push bloqueado

```bash
git push

[commitlens] Running pre-push pipeline...

  ✅ lint        passed
  ❌ tests       FAILED → 2 tests failing (blocking)

🚫 Push blocked — fix the errors above and try again
```

### Push exitoso

```bash
git push

[commitlens] Running pre-push pipeline...

  ✅ lint        passed
  ✅ tests       passed (42 tests)
  ✅ build       passed
  ⚠️  ai-review  warning → Consider adding error handling in upload.service.ts (non-blocking)

✅ Push completed (1 warning)
```

---

## ✅ Definition of Done (DoD)

Un feature o módulo se considera DONE cuando cumple TODO lo siguiente:

### General
- [ ] Implementación completa según los requisitos definidos en este prompt
- [ ] Build pasa sin errores → `tsup`
- [ ] Todos los tests pasan → `vitest run`
- [ ] Sin uso de `any` en TypeScript
- [ ] Sin `console.log` de debug olvidados
- [ ] Errores manejados con `CommitlensError` o `ProviderError` según corresponda

### Tests
- [ ] Test unitario creado en `tests/` para el módulo
- [ ] Casos cubiertos: happy path, error path, edge cases
- [ ] Providers y steps mockeados correctamente con Vitest

### Documentación
- [ ] JSDoc en todas las funciones públicas
- [ ] `README.md` actualizado si se agregó comando o provider nuevo
- [ ] `CHANGELOG.md` actualizado con el cambio

### Integración
- [ ] El comando CLI relacionado funciona manualmente con `commitlens run`
- [ ] No rompe proyectos sin `commitlens.config.ts`
- [ ] No rompe proyectos sin git inicializado

---

### Por tipo de módulo

#### Nuevo Provider
- [ ] Implementa `AIProvider` completo (`name`, `isAvailable`, `review`)
- [ ] `isAvailable()` retorna `false` sin lanzar excepciones
- [ ] `passed: true` solo si la respuesta del AI es exactamente `"OK"`
- [ ] Aparece correctamente en `commitlens doctor`
- [ ] Funciona como fallback si el provider principal no está disponible

#### Nuevo Step type
- [ ] Retorna `StepResult` correctamente en todos los casos
- [ ] Respeta `blocking: true/false` sin lanzar excepciones al pipeline
- [ ] Acumula warnings sin detener el pipeline si `blocking: false`

#### Nuevo comando CLI
- [ ] Registrado en `src/cli/index.ts`
- [ ] Todo output con prefijo `[commitlens]`
- [ ] Maneja correctamente el caso sin git inicializado
- [ ] Maneja correctamente el caso sin `commitlens.config.ts`
- [ ] 

## 🚫 Restricciones

- **No debe romper proyectos sin config**: si no existe `commitlens.config.ts`, los hooks se omiten silenciosamente
- **No debe bloquear `npm install`**: el `prepare` script debe fallar silenciosamente si git no está inicializado
- **No hardcodear API keys**: siempre leer desde `process.env` o la config del usuario
- **No modificar archivos del proyecto**: solo opera sobre `.git/hooks/` y lee archivos staged
- **Debe ser agnóstico al framework**: funcionar en React, Next.js, NestJS, Node puro, monorepos, etc.
- **Compatibilidad de SO**: Windows (Git Bash / WSL), macOS, Linux
- **Sin AI obligatorio**: si ningún provider está disponible, los steps de tipo `ai` advierten pero no bloquean
- **Tamaño mínimo**: evitar dependencias pesadas, el paquete debe ser liviano
- **Steps independientes**: el fallo de un step `blocking: false` nunca detiene los siguientes steps
- **Steps bloqueantes detienen el pipeline**: si un step `blocking: true` falla, no se ejecutan los steps siguientes

---

## 📁 Estructura de Carpetas

```
commitlens/
├── src/
│   ├── index.ts
│   ├── cli/
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── init.ts
│   │       ├── install.ts
│   │       ├── run.ts
│   │       ├── doctor.ts
│   │       └── use.ts
│   ├── core/
│   │   ├── hook-installer.ts
│   │   ├── pipeline-runner.ts    # Orquesta los steps en orden
│   │   ├── step-runner.ts        # Ejecuta un step individual
│   │   └── git.ts
│   ├── steps/
│   │   ├── command.step.ts       # Ejecuta comandos de shell
│   │   ├── ai.step.ts            # Ejecuta revisión AI
│   │   └── commit-msg.step.ts    # Valida mensaje de commit
│   ├── providers/
│   │   ├── base.provider.ts
│   │   ├── claude-code.provider.ts
│   │   ├── claude-api.provider.ts
│   │   ├── codex.provider.ts
│   │   ├── openai.provider.ts
│   │   └── custom.provider.ts
│   └── config/
│       ├── loader.ts
│       ├── schema.ts
│       └── defaults.ts
├── bin/
│   └── commitlens.js
├── templates/
│   └── commitlens.config.template.ts
├── tests/
├── tsup.config.ts
├── package.json
└── README.md
```

---

## 📦 package.json del Paquete

```json
{
  "name": "@aranza/commitlens",
  "version": "0.1.0",
  "description": "AI-powered git quality pipeline manager for JS/TS projects",
  "bin": {
    "commitlens": "./bin/commitlens.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest"
  },
  "keywords": ["git-hooks", "ai", "claude", "codex", "code-review", "lint", "pipeline", "aranza"],
  "publishConfig": {
    "access": "public"
  }
}
```

## 📦 package.json del Proyecto Consumidor

```json
{
  "devDependencies": {
    "@aranza/commitlens": "^1.0.0"
  },
  "scripts": {
    "prepare": "commitlens install"
  }
}
```

### Instalación en cualquier proyecto

```bash
npm install --save-dev @aranza/commitlens
npx commitlens init
```

---

## 🧩 Criterios de Éxito

- `npm install --save-dev @aranza/commitlens` en un proyecto existente no rompe nada
- `npx commitlens init` genera una config funcional en menos de 5 segundos
- Un commit ejecuta el pipeline completo mostrando cada step con su resultado
- Un step `blocking: false` que falla muestra warning pero permite continuar
- Un step `blocking: true` que falla detiene el pipeline y bloquea el commit/push
- Cambiar `provider: 'claude-code'` a `provider: 'openai'` es el único cambio necesario para migrar de provider AI
- `commitlens doctor` reporta claramente qué providers están disponibles y cuáles no
- Funciona correctamente en macOS, Linux y Windows (Git Bash / WSL)
- Si no existe `commitlens.config.ts`, el hook se omite silenciosamente sin romper el flujo de git

---

*Paquete parte del ecosistema **AranzaTech** — `@aranza` scope en npm.*
