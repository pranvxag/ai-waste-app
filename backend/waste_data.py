"""
Static reference data keyed by the 12 classes from the
mostafaabla/garbage-classification dataset.

IMPORTANT: keys here must exactly match the strings in class_names.json
produced by the training notebook (same spelling/casing/hyphenation).

Reuse/upcycling ideas are NOT stored here - they're generated dynamically by
llm_service.get_ai_reuse_ideas() per scan, so suggestions can be varied,
specific, and endless rather than a fixed list per class. This file only
covers the two things that are genuinely fixed facts about a material:
what category it falls into, and how to dispose of it.
"""

WASTE_INFO = {
    "battery": {
        "category": "hazardous",
        "disposal": "Never put batteries in regular trash or recycling — they can leak "
                     "chemicals or cause fires. Take them to a designated e-waste / "
                     "battery collection point (many electronics stores and municipal "
                     "offices have drop boxes).",
    },
    "biological": {
        "category": "compostable",
        "disposal": "Compostable organic waste. Add to a home compost bin, or your "
                     "municipality's wet/organic waste collection if available.",
    },
    "brown-glass": {
        "category": "recyclable",
        "disposal": "Rinse and place in glass recycling. Many municipalities ask for "
                     "glass to be separated by color — check local rules.",
    },
    "green-glass": {
        "category": "recyclable",
        "disposal": "Rinse and place in glass recycling, separated by color where "
                     "required locally.",
    },
    "white-glass": {
        "category": "recyclable",
        "disposal": "Rinse and place in glass recycling, separated by color where "
                     "required locally.",
    },
    "cardboard": {
        "category": "recyclable",
        "disposal": "Flatten, keep dry, and place in paper/cardboard recycling. "
                     "Remove tape and heavy staples if possible.",
    },
    "clothes": {
        "category": "reusable / textile recycling",
        "disposal": "If still wearable, donate. If not, look for a textile recycling "
                     "drop-off — clothes should not go in general trash where possible.",
    },
    "metal": {
        "category": "recyclable",
        "disposal": "Rinse cans/containers and place in metal recycling.",
    },
    "paper": {
        "category": "recyclable",
        "disposal": "Keep dry and place in paper recycling. Shred sensitive documents first if needed.",
    },
    "plastic": {
        "category": "recyclable (check resin code)",
        "disposal": "Rinse and place in plastic recycling. Check the resin identification "
                     "code (the number inside the recycling triangle) against local rules, "
                     "since not all plastics are accepted everywhere.",
    },
    "shoes": {
        "category": "reusable / textile recycling",
        "disposal": "If wearable, donate. Some shoe brands and stores run take-back/recycling "
                     "programs for old shoes.",
    },
    "trash": {
        "category": "general waste",
        "disposal": "Items like soiled tissues, certain packaging, or mixed materials that "
                     "can't be easily recycled or composted. Dispose of in general waste/landfill bin.",
    },
}


def get_waste_info(predicted_class: str) -> dict:
    """Look up category + disposal info for a predicted class, with a safe fallback."""
    return WASTE_INFO.get(
        predicted_class,
        {
            "category": "unknown",
            "disposal": "Could not find specific guidance for this item — when in doubt, "
                        "check your local municipal waste guidelines.",
        },
    )
