# Analisis del Calculo de Dias en budget.py

**Archivo:** `/root/gastodehoy/app/services/budget.py`
**Fecha de analisis:** 2026-05-12

---

## 1. ¿El calculo usa 30 dias fijos o depende del mes actual?

**Depende del mes actual. NO usa 30 dias fijos.**

El calculo se basa en la libreria estandar `calendar.monthrange()`, que retorna el numero real de dias del mes correspondiente a la fecha de referencia.

### Fragmento clave: `month_bounds()` (lineas 44-49)

```python
def month_bounds(reference: date) -> tuple[date, last_day]:
    """Return (first_day, last_day) of the month containing ``reference``."""
    last_day = calendar.monthrange(reference.year, reference.month)[1]
    start = date(reference.year, reference.month, 1)
    end = date(reference.year, reference.month, last_day)
    return start, end
```

`calendar.monthrange()` retorna el ultimo dia real del mes:
- Enero → 31
- Febrero → 28 (o 29 en bisiesto)
- Abril → 30
- etc.

### Fragmento clave: `days_remaining_in_month()` (lineas 52-55)

```python
def days_remaining_in_month(reference: date) -> int:
    """Number of days from ``reference`` (inclusive) to month end."""
    _, end = month_bounds(reference)
    return (end - reference).days + 1
```

Los dias restantes se calculan como `(fin_del_mes - fecha_hoy).days + 1`, incluyendo el dia actual. Por ejemplo, si hoy es 12 de mayo (mes de 31 dias):
- `(31 - 12) + 1 = 20` dias restantes.

### Uso en `compute_summary()` (lineas 119-121)

```python
days_left = days_remaining_in_month(reference)
divisor = Decimal(max(1, days_left))
suggested = (remaining / divisor).quantize(Decimal("0.01"))
```

El presupuesto diario sugerido = `restante_del_mes / dias_restantes`. Se usa `max(1, days_left)` como proteccion para evitar division por cero en el ultimo dia del mes.

**Conclus:** El calculo es dinamico y se adapta al mes real (28, 29, 30 o 31 dias).

---

## 2. ¿Los gastos fijos se reinician cada mes o son persistentes?

**Son persistentes. NO se reinician cada mes.**

### Fragmento clave (lineas 87-92)

```python
fixed_total = session.scalar(
    select(func.coalesce(func.sum(FixedExpense.amount), 0)).where(
        FixedExpense.user_id == user_id
    )
) or Decimal("0")
```

La consulta suma **TODOS** los registros de `FixedExpense` del usuario, sin ningun filtro de fecha. Esto significa:

- Los gastos fijos son registros permanentes en la base de datos.
- Se acumulan mes a mes sin reiniciarse.
- El usuario debe eliminarlos manualmente si ya no aplican (ej. cancelo una suscripcion).
- El modelo `FixedExpense` (en `models.py` lineas 98-112) **no tiene columna de fecha**, solo `name` y `amount`.

```python
class FixedExpense(Base):
    """Recurring monthly expense (rent, subscriptions...)."""
    __tablename__ = "fixed_expenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), ...)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    # Sin columna de fecha — el gasto aplica siempre.
```

**Con:** Si el usuario olvida eliminar un gasto fijo que ya no aplica, seguira descontandose indefinidamente.

---

## 3. ¿El extra income se pierde al cambiar de mes?

**Si, el extra income se pierde al cambiar de mes.**

### Fragmento clave (lineas 103-110)

```python
extra_month = _sum_amount_in_month(
    session,
    ExtraIncome,
    user_id,
    ExtraIncome.received_at,
    month_start,
    month_end,
)
```

La funcion `_sum_amount_in_month()` (lineas 21-36) filtra por rango de fechas:

```python
def _sum_amount_in_month(session, model_cls, user_id, date_column, month_start, month_end):
    raw = session.scalar(
        select(func.coalesce(func.sum(model_cls.amount), 0)).where(
            model_cls.user_id == user_id,
            date_column >= month_start,
            date_column <= month_end,
        )
    ) or Decimal("0")
    return Decimal(raw).quantize(Decimal("0.01"))
```

Solo se suman los `ExtraIncome` cuya columna `received_at` caiga dentro del mes actual (`month_start` a `month_end`).

El modelo `ExtraIncome` tiene una columna de fecha (`received_at`):

```python
class ExtraIncome(Base):
    """Occasional income in a given month (bonus, extra payroll…), dated."""
    received_at: Mapped[date] = mapped_column(Date, nullable=False)
```

**Consecuencia practica:**
- Si el usuario registro un bono el 15 de abril con `received_at = 2026-04-15`, ese ingreso solo se contabiliza en abril.
- Al llegar mayo, ese bono ya no se incluye en el calculo.
- Los registros NO se borran de la BD, pero no afectan el presupuesto de meses posteriores.

**Nota importante:** El ahorro se calcula solo sobre el sueldo base (`income`), no sobre el ingreso extra. El extra solo afecta el `effective_income`:

```python
effective_income = income + extra_month  # linea 114
```

---

## 4. ¿Que pasa si el usuario no configura su ingreso mensual (queda en 0)?

**El sistema no falla, pero produce un presupuesto negativo o cero.**

### Valor por defecto

En el modelo `UserSettings` (lineas 80-82):

```python
monthly_income: Mapped[Decimal] = mapped_column(
    Numeric(14, 2), default=Decimal("0"), nullable=False
)
```

Si el usuario nunca configura su ingreso, `monthly_income = 0`.

### Flujo con income = 0

1. **Ahorro:** Si `savings_mode = "percent"` (default), el ahorro es `0 * 0 / 100 = 0`. Si `savings_mode = "fixed"`, el ahorro se acota a `[0, 0] = 0`.

2. **Presupuesto mensual:**
   ```python
   effective_income = 0 + extra_month
   monthly_budget = effective_income - 0 - fixed_total
   # Resultado: monthly_budget = extra_month - fixed_total
   ```

3. **Restante:**
   ```python
   remaining = monthly_budget - variable_spent
   # Resultado: remaining = extra_month - fixed_total - variable_spent
   ```

4. **Gasto diario sugerido:**
   ```python
   suggested = remaining / dias_restantes
   # Resultado: un numero negativo (o cero si no hay gastos)
   ```

### Protecciones existentes

- **Ahorro acotado** (lineas 79-85): `savings_amount = max(0, min(fixed_savings, income))` — evita que un ahorro fijo mayor que el ingreso genere presupuesto negativo por ese concepto.
- **Division segura** (linea 120): `divisor = Decimal(max(1, days_left))` — evita division por cero.

### Protecciones FALTANTES

- **No hay validacion** que impida mostrar un `suggested_spend_today` negativo al usuario.
- **No hay advertencia** cuando `monthly_income` es 0.
- El usuario vera un gasto diario sugerido negativo (ej. `-1500.50`), lo cual es confuso.

**Con:** El sistema es robusto (no crashea), pero la UX es deficiente cuando el ingreso no esta configurado. Se deberia mostrar un mensaje de advertencia o forzar la configuracion del ingreso antes de mostrar el dashboard.

---

## Resumen

| Aspecto | Comportamiento |
|---|---|
| Dias del mes | Dinamico (28-31 segun `calendar.monthrange`) |
| Gastos fijos | Persistentes en BD, sin filtro de fecha |
| Extra income | Solo aplica al mes de `received_at`, se "pierde" al cambiar de mes |
| Income = 0 | No crashea, pero muestra presupuesto negativo sin advertencia |
