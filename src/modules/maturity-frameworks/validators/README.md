# Validadores de Maturity Frameworks

## Validación Condicional de Campos

El validador `MaturityLevelFieldsValidator` asegura que los campos proporcionados al crear o actualizar un nivel de madurez sean coherentes con el tipo de scoring del framework al que pertenecen.

### Reglas por Tipo de Scoring

#### 1. DISCRETE (Discreto: 0, 1, 2, 3, 4, 5)

**Campos requeridos:**

- `numericValue`: Debe estar entre `minValue` y `maxValue` del framework

**Campos NO permitidos:**

- `minRange` ❌
- `maxRange` ❌
- `weight` ❌

**Ejemplo:**

```json
{
  "frameworkId": "uuid-del-framework",
  "numericValue": 3,
  "displayValue": "3",
  "name": "Nivel 3 - Definido"
}
```

#### 2. PERCENTAGE (Porcentaje: 0-100%)

**Campos requeridos:**

- `minRange`: Mínimo del rango (0-100)
- `maxRange`: Máximo del rango (0-100)
- `minRange` debe ser menor que `maxRange`

**Campos NO permitidos:**

- `weight` ❌

**Ejemplo:**

```json
{
  "frameworkId": "uuid-del-framework",
  "numericValue": 75,
  "displayValue": "75%",
  "name": "Nivel Alto",
  "minRange": 70,
  "maxRange": 89
}
```

#### 3. BINARY (Binario: 0 o 1)

**Campos requeridos:**

- `numericValue`: Solo puede ser 0 o 1

**Campos NO permitidos:**

- `minRange` ❌
- `maxRange` ❌
- `weight` ❌

**Ejemplo:**

```json
{
  "frameworkId": "uuid-del-framework",
  "numericValue": 1,
  "displayValue": "Cumple",
  "name": "Conforme"
}
```

#### 4. WEIGHTED (Ponderado)

**Campos requeridos:**

- `weight`: Peso del nivel (0-1) - Solo si el framework tiene `useWeights = true`

**Ejemplo:**

```json
{
  "frameworkId": "uuid-del-framework",
  "numericValue": 4,
  "displayValue": "4",
  "name": "Nivel 4 - Gestionado",
  "weight": 0.25
}
```

#### 5. CUSTOM (Personalizado)

**Campos permitidos:**

- Cualquier combinación de campos es válida
- Máxima flexibilidad para casos especiales

### Mensajes de Error

Si intentas crear un nivel de madurez con campos que no corresponden al tipo de scoring del framework, recibirás un error de validación:

```json
{
  "statusCode": 400,
  "message": [
    "Los campos proporcionados no corresponden al tipo de scoring del framework. Verifica minRange, maxRange y weight según el tipo."
  ],
  "error": "Bad Request"
}
```

### Uso en el Código

El validador se aplica automáticamente en el `CreateMaturityLevelDto`:

```typescript
@IsUUID('4', { message: 'El frameworkId debe ser un UUID válido' })
@IsValidMaturityLevelFields({
  message: 'Los campos proporcionados no corresponden al tipo de scoring del framework.'
})
frameworkId: string
```

### Funcionamiento Interno

1. El validador consulta el framework por su ID
2. Obtiene el `scoringType` del framework
3. Valida que los campos proporcionados sean coherentes con ese tipo
4. Retorna `true` si la validación pasa, `false` si falla
