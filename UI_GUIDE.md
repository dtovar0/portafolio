# UI Guide: El Gato Gourmet Mty

## Brand Tokens
- **NARANJA_PRIMARY:** `#FF5733`
- **AZUL_SECONDARY:** `#2C3E50`
- **WHITE:** `#FFFFFF`
- **GRAY_LIGHT:** `#F8F9FA`

## Layout & Symmetry
- **Spacing:** Multiplos de 8px (Sistema 8pt).
- **Height:** Contenedores raíz siempre `h-full` o `min-h-screen`.
- **CSS:** Metodología BEM, variables CSS para tokens. Prohibido `style=""`.

## Component Rules
- **Interactive:** `:active { transform: scale(0.97); }`
- **Touch Targets:** Mínimo 48px (MODO-ANDROID).
- **Highlights:** `-webkit-tap-highlight-color: transparent`.
