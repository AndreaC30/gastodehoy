"""Translation strings for insights — maps English keys to locale dictionaries."""

INSIGHT_TRANSLATIONS = {
    "en": {
        "more_spending": "More spending than last month",
        "less_spending": "Less spending than last month",
        "similar_pace": "Similar pace to last month",
        "concentrated_spending": "Concentrated spending",
        "high_spending_ratio": "You're spending almost all your income",
        "good_pace": "Good spending pace!",
        "projected_overspend": "Projected overspend",
        "categorize_expenses": "Categorize your expenses",
        "high_fixed_costs": "High fixed expenses",
        "daily_limit": "Recommended daily cap",
        "budget_exhausted": "Budget exhausted",
        "keep_recording": "Keep recording",
        "budget_exceeded": "Budget exceeded: {name}",
        "uncategorized": "Uncategorized",

        # Messages
        "msg_more": "+{pct}% vs last month ({curr}€ → {prev}€)",
        "msg_less": "−{pct}% vs last month ({curr}€ → {prev}€)",
        "msg_similar": "Similar to last month: {curr}€ ≈ {prev}€",
        "msg_concentrated": "{pct}% of your spending in {name}. Can you lower it?",
        "msg_budget_exhausted": "You overspent by {over}€. Fixed + savings: {fixed}€ | Variable: {var}€",
        "msg_high_ratio": "{pct}% spent. {remaining}€ left of {total}€.",
        "msg_good_pace": "Only {pct}% spent. You have {remaining}€ left.",
        "msg_projected": "You're projecting {proj}€ (+{over}€ over your {cap}€ cap). Slow down.",
        "msg_budget_exceeded": "{name}: {spent}€ of {budget}€. Slow down or raise the limit.",
        "msg_uncategorized": "{count} uncategorized expenses. You won't know where your money goes.",
        "msg_fixed_ratio": "{pct}% of your income is fixed. Healthy is < 50%.",
        "msg_daily_tip": "{remaining}€ ÷ {days} days = {daily}€/day",
        "msg_fallback": "Record more expenses to see spending habit analysis.",

        # 503020 rule insights
        "r503020_no_income": "Set your monthly income in Settings to see the 50/30/20 rule.",
        "r503020_needs_over": "Needs at {needs}% — cap is {target}%.",
        "r503020_needs_ok": "Needs: {needs}% (target ≤{target}%)",
        "r503020_wants_over": "Wants at {wants}% — try to stay under {target}%.",
        "r503020_wants_ok": "Wants: {wants}% (target ≤{target}%)",
        "r503020_savings_under": "Savings at {savings}% — recommended minimum is {target}%.",
        "r503020_savings_ok": "Savings: {savings}% (target ≥{target}%)",
        "r503020_fallback": "Record more expenses to compare with the 50/30/20 rule.",

        # Notification messages
        "notif_daily_budget_title": "You're doing great on GastoDeHoy",
        "notif_daily_budget_body": "You can spend up to {amount}€ today.",
        "notif_daily_budget_body_remaining": "You can spend up to {amount}€ today. You have {remaining}€ left this month.",
        "notif_daily_limit_title": "Your daily cap",

        # Category
        "uncategorized_label": "Uncategorized",
    },
    "es": {
        "more_spending": "Más gasto que el mes pasado",
        "less_spending": "Menos gasto que el mes pasado",
        "similar_pace": "Ritmo similar al mes pasado",
        "concentrated_spending": "Gasto concentrado",
        "high_spending_ratio": "Gastas casi todo tu ingreso",
        "good_pace": "¡Buen ritmo de gasto!",
        "projected_overspend": "Proyección de sobregasto",
        "categorize_expenses": "Categoriza tus gastos",
        "high_fixed_costs": "Gastos fijos altos",
        "daily_limit": "Tope diario recomendado",
        "budget_exhausted": "Presupuesto agotado",
        "keep_recording": "Sigue registrando",
        "budget_exceeded": "Presupuesto superado: {name}",
        "uncategorized": "Sin categoría",

        "msg_more": "+{pct}% vs mes anterior ({curr}€ → {prev}€)",
        "msg_less": "−{pct}% vs mes anterior ({curr}€ → {prev}€)",
        "msg_similar": "Similar al mes pasado: {curr}€ ≈ {prev}€",
        "msg_concentrated": "{pct}% de tu gasto en {name}. ¿Puedes bajarlo?",
        "msg_budget_exhausted": "Te has pasado {over}€. Fijos + ahorro: {fixed}€ | Variables: {var}€",
        "msg_high_ratio": "{pct}% gastado. Quedan {remaining}€ de {total}€.",
        "msg_good_pace": "Solo {pct}% gastado. Te quedan {remaining}€.",
        "msg_projected": "Proyectas {proj}€ (+{over}€ sobre tu tope de {cap}€). Baja el ritmo.",
        "msg_budget_exceeded": "{name}: {spent}€ de {budget}€. Baja el ritmo o sube el límite.",
        "msg_uncategorized": "{count} gastos sin categoría. Así no sabrás en qué se va el dinero.",
        "msg_fixed_ratio": "{pct}% de tu ingreso son fijos. Lo sano es < 50%.",
        "msg_daily_tip": "{remaining}€ ÷ {days} días = {daily}€/día",
        "msg_fallback": "Registra más gastos para ver análisis de tus hábitos.",

        # 503020 rule insights
        "r503020_no_income": "Configura tu ingreso mensual en Ajustes para ver la regla 50/30/20.",
        "r503020_needs_over": "Necesidades al {needs}% — el tope es {target}%.",
        "r503020_needs_ok": "Necesidades: {needs}% (objetivo ≤{target}%)",
        "r503020_wants_over": "Deseos al {wants}% — intenta no pasar del {target}%.",
        "r503020_wants_ok": "Deseos: {wants}% (objetivo ≤{target}%)",
        "r503020_savings_under": "Ahorro al {savings}% — el mínimo recomendado es {target}%.",
        "r503020_savings_ok": "Ahorro: {savings}% (objetivo ≥{target}%)",
        "r503020_fallback": "Registra más gastos para comparar con la regla 50/30/20.",

        # Notification messages
        "notif_daily_budget_title": "Vas bien en GastoDeHoy",
        "notif_daily_budget_body": "Hoy puedes gastar hasta {amount}€.",
        "notif_daily_budget_body_remaining": "Hoy puedes gastar hasta {amount}€. Te quedan {remaining}€ este mes.",
        "notif_daily_limit_title": "Tu tope de hoy",

        "uncategorized_label": "Sin categoría",
    },
    "fr": {
        "more_spending": "Plus de dépenses que le mois dernier",
        "less_spending": "Moins de dépenses que le mois dernier",
        "similar_pace": "Rythme similaire au mois dernier",
        "concentrated_spending": "Dépenses concentrées",
        "high_spending_ratio": "Vous dépensez presque tous vos revenus",
        "good_pace": "Bon rythme de dépenses !",
        "projected_overspend": "Projection de dépassement",
        "categorize_expenses": "Catégorisez vos dépenses",
        "high_fixed_costs": "Frais fixes élevés",
        "daily_limit": "Plafond quotidien recommandé",
        "budget_exhausted": "Budget épuisé",
        "keep_recording": "Continuez d'enregistrer",
        "budget_exceeded": "Budget dépassé : {name}",
        "uncategorized": "Sans catégorie",

        "msg_more": "+{pct}% vs mois dernier ({curr}€ → {prev}€)",
        "msg_less": "−{pct}% vs mois dernier ({curr}€ → {prev}€)",
        "msg_similar": "Similaire au mois dernier : {curr}€ ≈ {prev}€",
        "msg_concentrated": "{pct}% de vos dépenses en {name}. Pouvez-vous réduire ?",
        "msg_budget_exhausted": "Dépassement de {over}€. Fixes + épargne : {fixed}€ | Variables : {var}€",
        "msg_high_ratio": "{pct}% dépensé. Il reste {remaining}€ sur {total}€.",
        "msg_good_pace": "Seulement {pct}% dépensé. Il vous reste {remaining}€.",
        "msg_projected": "Projection de {proj}€ (+{over}€ au-dessus de votre plafond de {cap}€). Ralentissez.",
        "msg_budget_exceeded": "{name} : {spent}€ sur {budget}€. Ralentissez ou augmentez la limite.",
        "msg_uncategorized": "{count} dépenses sans catégorie. Vous ne saurez pas où va l'argent.",
        "msg_fixed_ratio": "{pct}% de vos revenus sont fixes. < 50% est sain.",
        "msg_daily_tip": "{remaining}€ ÷ {days} jours = {daily}€/jour",
        "msg_fallback": "Enregistrez plus de dépenses pour voir l'analyse de vos habitudes.",

        # 503020 rule insights
        "r503020_no_income": "Configurez votre revenu mensuel dans Paramètres pour voir la règle 50/30/20.",
        "r503020_needs_over": "Besoins à {needs}% — le plafond est de {target}%.",
        "r503020_needs_ok": "Besoins : {needs}% (objectif ≤{target}%)",
        "r503020_wants_over": "Désirs à {wants}% — essayez de rester sous {target}%.",
        "r503020_wants_ok": "Désirs : {wants}% (objectif ≤{target}%)",
        "r503020_savings_under": "Épargne à {savings}% — le minimum recommandé est {target}%.",
        "r503020_savings_ok": "Épargne : {savings}% (objectif ≥{target}%)",
        "r503020_fallback": "Enregistrez plus de dépenses pour comparer avec la règle 50/30/20.",

        # Notification messages
        "notif_daily_budget_title": "Vous gérez bien sur GastoDeHoy",
        "notif_daily_budget_body": "Vous pouvez dépenser jusqu'à {amount}€ aujourd'hui.",
        "notif_daily_budget_body_remaining": "Vous pouvez dépenser jusqu'à {amount}€ aujourd'hui. Il vous reste {remaining}€ ce mois.",
        "notif_daily_limit_title": "Votre plafond du jour",

        "uncategorized_label": "Sans catégorie",
    },
    "de": {
        "more_spending": "Mehr Ausgaben als letzten Monat",
        "less_spending": "Weniger Ausgaben als letzten Monat",
        "similar_pace": "Ähnliches Tempo wie letzten Monat",
        "concentrated_spending": "Konzentrierte Ausgaben",
        "high_spending_ratio": "Du gibst fast dein ganzes Einkommen aus",
        "good_pace": "Gutes Ausgabentempo!",
        "projected_overspend": "Prognostizierte Überschreitung",
        "categorize_expenses": "Kategorisiere deine Ausgaben",
        "high_fixed_costs": "Hohe Fixkosten",
        "daily_limit": "Empfohlenes Tageslimit",
        "budget_exhausted": "Budget erschöpft",
        "keep_recording": "Weiter aufzeichnen",
        "budget_exceeded": "Budget überschritten: {name}",
        "uncategorized": "Ohne Kategorie",

        "msg_more": "+{pct}% vs letzten Monat ({curr}€ → {prev}€)",
        "msg_less": "−{pct}% vs letzten Monat ({curr}€ → {prev}€)",
        "msg_similar": "Ähnlich wie letzten Monat: {curr}€ ≈ {prev}€",
        "msg_concentrated": "{pct}% deiner Ausgaben in {name}. Kannst du das senken?",
        "msg_budget_exhausted": "Du hast {over}€ überschritten. Fix + Sparen: {fixed}€ | Variabel: {var}€",
        "msg_high_ratio": "{pct}% ausgegeben. Noch {remaining}€ von {total}€ übrig.",
        "msg_good_pace": "Nur {pct}% ausgegeben. Du hast noch {remaining}€.",
        "msg_projected": "Prognose: {proj}€ (+{over}€ über deinem Limit von {cap}€). Langsamer machen.",
        "msg_budget_exceeded": "{name}: {spent}€ von {budget}€. Langsamer machen oder Limit erhöhen.",
        "msg_uncategorized": "{count} nicht kategorisierte Ausgaben. So weißt du nicht, wohin das Geld geht.",
        "msg_fixed_ratio": "{pct}% deines Einkommens sind Fixkosten. Gesund ist < 50%.",
        "msg_daily_tip": "{remaining}€ ÷ {days} Tage = {daily}€/Tag",
        "msg_fallback": "Zeichne mehr Ausgaben auf, um Gewohnheitsanalysen zu sehen.",

        # 503020 rule insights
        "r503020_no_income": "Richte dein monatliches Einkommen in den Einstellungen ein, um die 50/30/20-Regel zu sehen.",
        "r503020_needs_over": "Bedürfnisse bei {needs}% — Obergrenze ist {target}%.",
        "r503020_needs_ok": "Bedürfnisse: {needs}% (Ziel ≤{target}%)",
        "r503020_wants_over": "Wünsche bei {wants}% — versuche unter {target}% zu bleiben.",
        "r503020_wants_ok": "Wünsche: {wants}% (Ziel ≤{target}%)",
        "r503020_savings_under": "Sparen bei {savings}% — empfohlenes Minimum ist {target}%.",
        "r503020_savings_ok": "Sparen: {savings}% (Ziel ≥{target}%)",
        "r503020_fallback": "Erfasse mehr Ausgaben, um mit der 50/30/20-Regel zu vergleichen.",

        # Notification messages
        "notif_daily_budget_title": "Du machst das super auf GastoDeHoy",
        "notif_daily_budget_body": "Du kannst heute bis zu {amount}€ ausgeben.",
        "notif_daily_budget_body_remaining": "Du kannst heute bis zu {amount}€ ausgeben. Du hast noch {remaining}€ diesen Monat.",
        "notif_daily_limit_title": "Dein Tageslimit",

        "uncategorized_label": "Ohne Kategorie",
    },
}


def get_insight_text(lang: str, key: str, **kwargs) -> str:
    """Return translated string for the given language, falling back to Spanish."""
    locale = INSIGHT_TRANSLATIONS.get(lang) or INSIGHT_TRANSLATIONS["es"]
    template = locale.get(key)
    if template is None:
        # Fall back to Spanish
        template = INSIGHT_TRANSLATIONS["es"].get(key, key)
    if kwargs:
        return template.format(**kwargs)
    return template
