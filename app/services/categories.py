"""Category seeding and helpers."""

from sqlalchemy.orm import Session

from app.models import ExpenseCategory

# Map of category name to icon key (react-icons / category-icon map)
DEFAULT_CATEGORIES: list[dict[str, str]] = [
    {"name": "Comida",     "color": "#f59e0b", "icon": "UtensilsCrossed"},
    {"name": "Transporte",  "color": "#3b82f6", "icon": "Car"},
    {"name": "Ocio",        "color": "#a855f7", "icon": "Gamepad2"},
    {"name": "Salud",       "color": "#ef4444", "icon": "HeartPulse"},
    {"name": "Educación",   "color": "#10b981", "icon": "GraduationCap"},
    {"name": "Hogar",       "color": "#6366f1", "icon": "Home"},
    {"name": "Ropa",        "color": "#ec4899", "icon": "Shirt"},
    {"name": "Otros",       "color": "#64748b", "icon": "Package"},
]


def seed_default_categories(db: Session, user_id: int) -> list[ExpenseCategory]:
    """Create the built-in category set for a new user if they have none."""
    existing = db.query(ExpenseCategory).filter(
        ExpenseCategory.user_id == user_id
    ).first()
    if existing:
        return []
    rows = [
        ExpenseCategory(
            user_id=user_id,
            name=c["name"],
            color=c["color"],
            icon=c["icon"],
            is_default=True,
        )
        for c in DEFAULT_CATEGORIES
    ]
    db.add_all(rows)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows
