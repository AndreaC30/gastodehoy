"""Category seeding and helpers."""

from sqlalchemy.orm import Session

from app.models import ExpenseCategory

# Default categories per language (created on registration)
DEFAULT_CATEGORIES: dict[str, list[dict[str, str]]] = {
    "es": [
        {"name": "Comida",       "color": "#f59e0b", "icon": "UtensilsCrossed"},
        {"name": "Supermercado", "color": "#14b8a6", "icon": "ShoppingCart"},
        {"name": "Transporte",   "color": "#3b82f6", "icon": "Car"},
        {"name": "Ocio",        "color": "#a855f7", "icon": "Gamepad2"},
        {"name": "Salud",       "color": "#ef4444", "icon": "HeartPulse"},
        {"name": "Educación",   "color": "#10b981", "icon": "GraduationCap"},
        {"name": "Hogar",       "color": "#6366f1", "icon": "Home"},
        {"name": "Ropa",        "color": "#ec4899", "icon": "Shirt"},
        {"name": "Otros",       "color": "#64748b", "icon": "Package"},
    ],
    "en": [
        {"name": "Food",         "color": "#f59e0b", "icon": "UtensilsCrossed"},
        {"name": "Groceries",    "color": "#14b8a6", "icon": "ShoppingCart"},
        {"name": "Transport",    "color": "#3b82f6", "icon": "Car"},
        {"name": "Leisure",      "color": "#a855f7", "icon": "Gamepad2"},
        {"name": "Health",       "color": "#ef4444", "icon": "HeartPulse"},
        {"name": "Education",    "color": "#10b981", "icon": "GraduationCap"},
        {"name": "Home",         "color": "#6366f1", "icon": "Home"},
        {"name": "Clothing",     "color": "#ec4899", "icon": "Shirt"},
        {"name": "Other",        "color": "#64748b", "icon": "Package"},
    ],
    "de": [
        {"name": "Essen",        "color": "#f59e0b", "icon": "UtensilsCrossed"},
        {"name": "Supermarkt",   "color": "#14b8a6", "icon": "ShoppingCart"},
        {"name": "Transport",    "color": "#3b82f6", "icon": "Car"},
        {"name": "Freizeit",     "color": "#a855f7", "icon": "Gamepad2"},
        {"name": "Gesundheit",   "color": "#ef4444", "icon": "HeartPulse"},
        {"name": "Bildung",      "color": "#10b981", "icon": "GraduationCap"},
        {"name": "Zuhause",      "color": "#6366f1", "icon": "Home"},
        {"name": "Kleidung",     "color": "#ec4899", "icon": "Shirt"},
        {"name": "Sonstiges",    "color": "#64748b", "icon": "Package"},
    ],
    "fr": [
        {"name": "Alimentation", "color": "#f59e0b", "icon": "UtensilsCrossed"},
        {"name": "Supermarché",  "color": "#14b8a6", "icon": "ShoppingCart"},
        {"name": "Transport",    "color": "#3b82f6", "icon": "Car"},
        {"name": "Loisirs",      "color": "#a855f7", "icon": "Gamepad2"},
        {"name": "Santé",        "color": "#ef4444", "icon": "HeartPulse"},
        {"name": "Éducation",    "color": "#10b981", "icon": "GraduationCap"},
        {"name": "Maison",       "color": "#6366f1", "icon": "Home"},
        {"name": "Vêtements",    "color": "#ec4899", "icon": "Shirt"},
        {"name": "Autres",       "color": "#64748b", "icon": "Package"},
    ],
}

# Legacy Spanish-only list (used by migrations for existing users)
_LEGACY_DEFAULT_CATEGORIES = DEFAULT_CATEGORIES["es"]


def seed_default_categories(db: Session, user_id: int, lang: str = "es") -> list[ExpenseCategory]:
    """Create the built-in category set for a new user in their language."""
    existing = db.query(ExpenseCategory).filter(
        ExpenseCategory.user_id == user_id
    ).first()
    if existing:
        return []
    cats = DEFAULT_CATEGORIES.get(lang, DEFAULT_CATEGORIES["es"])
    rows = [
        ExpenseCategory(
            user_id=user_id,
            name=c["name"],
            color=c["color"],
            icon=c["icon"],
            is_default=True,
        )
        for c in cats
    ]
    db.add_all(rows)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


def rename_default_categories(db: Session, user_id: int, lang: str) -> int:
    """Rename the user's default categories to match the new language.
    
    Matches by icon (which is language-independent) and updates the name.
    Returns the number of categories renamed.
    """
    cats = DEFAULT_CATEGORIES.get(lang)
    if not cats:
        return 0
    
    # Build a map: icon → name in the target language
    name_by_icon = {c["icon"]: c["name"] for c in cats}
    
    # Fetch the user's default categories
    user_defaults = db.query(ExpenseCategory).filter(
        ExpenseCategory.user_id == user_id,
        ExpenseCategory.is_default == True,
    ).all()
    
    renamed = 0
    for cat in user_defaults:
        if cat.icon and cat.icon in name_by_icon:
            new_name = name_by_icon[cat.icon]
            if cat.name != new_name:
                cat.name = new_name
                renamed += 1
    
    if renamed:
        db.commit()
    return renamed
