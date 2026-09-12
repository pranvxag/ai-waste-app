"""
Static reference data keyed by the 12 classes from the
mostafaabla/garbage-classification dataset.

IMPORTANT: keys here must exactly match the strings in class_names.json
produced by the training notebook (same spelling/casing/hyphenation).
"""

WASTE_INFO = {
    "battery": {
        "category": "hazardous",
        "disposal": "Never put batteries in regular trash or recycling — they can leak "
                     "chemicals or cause fires. Take them to a designated e-waste / "
                     "battery collection point (many electronics stores and municipal "
                     "offices have drop boxes).",
        "reuse_ideas": [
            "Check if it's rechargeable — some battery types can be reconditioned rather than discarded.",
            "Old (non-working) batteries can be used in classroom science demos on circuits (with adult supervision, terminals taped).",
            "Keep a small labelled box at home to collect dead batteries until you have a full one to drop off — safer than tossing them one at a time.",
        ],
    },
    "biological": {
        "category": "compostable",
        "disposal": "Compostable organic waste. Add to a home compost bin, or your "
                     "municipality's wet/organic waste collection if available.",
        "reuse_ideas": [
            "Fruit and vegetable scraps can be composted into nutrient-rich soil for potted plants.",
            "Eggshells and coffee grounds can be used directly in garden soil or as a natural pest deterrent.",
            "Start a small kitchen compost bin — even a covered bucket works for apartment living.",
        ],
    },
    "brown-glass": {
        "category": "recyclable",
        "disposal": "Rinse and place in glass recycling. Many municipalities ask for "
                     "glass to be separated by color — check local rules.",
        "reuse_ideas": [
            "Clean brown glass bottles make good storage containers for homemade sauces or oils.",
            "Use as a rustic vase or candle holder.",
            "Cut and sanded glass bottles can become drinking glasses (DIY tutorials widely available).",
        ],
    },
    "green-glass": {
        "category": "recyclable",
        "disposal": "Rinse and place in glass recycling, separated by color where "
                     "required locally.",
        "reuse_ideas": [
            "Reuse as a water carafe or decorative bottle.",
            "Turn into a self-watering planter for herbs.",
            "Use as a organizer for kitchen utensils or craft supplies.",
        ],
    },
    "white-glass": {
        "category": "recyclable",
        "disposal": "Rinse and place in glass recycling, separated by color where "
                     "required locally.",
        "reuse_ideas": [
            "Clear jars are great for pantry storage (grains, spices, snacks).",
            "Use as a pen/pencil holder or bathroom organizer.",
            "Repurpose as a terrarium for small plants.",
        ],
    },
    "cardboard": {
        "category": "recyclable",
        "disposal": "Flatten, keep dry, and place in paper/cardboard recycling. "
                     "Remove tape and heavy staples if possible.",
        "reuse_ideas": [
            "Great for storage boxes, house-move packing, or drawer organizers.",
            "Use as a base for kids' craft projects (forts, cutouts, models).",
            "Flattened cardboard makes an effective weed-suppressing garden mulch layer.",
        ],
    },
    "clothes": {
        "category": "reusable / textile recycling",
        "disposal": "If still wearable, donate. If not, look for a textile recycling "
                     "drop-off — clothes should not go in general trash where possible.",
        "reuse_ideas": [
            "Donate wearable clothes to charity or a local shelter.",
            "Cut into cleaning rags for household use.",
            "Old t-shirts can be turned into tote bags or cushion covers with simple sewing.",
        ],
    },
    "metal": {
        "category": "recyclable",
        "disposal": "Rinse cans/containers and place in metal recycling.",
        "reuse_ideas": [
            "Clean cans make simple pen holders, planters, or storage tins.",
            "Larger metal containers can be repurposed for organizing tools or garden supplies.",
            "Bottle caps and small metal pieces are popular in craft/mosaic projects.",
        ],
    },
    "paper": {
        "category": "recyclable",
        "disposal": "Keep dry and place in paper recycling. Shred sensitive documents first if needed.",
        "reuse_ideas": [
            "Use blank sides for notes, sketches, or scrap paper before recycling.",
            "Old newspapers work well for wrapping, cleaning glass, or lining drawers.",
            "Paper can be shredded and used as packing material or added to compost.",
        ],
    },
    "plastic": {
        "category": "recyclable (check resin code)",
        "disposal": "Rinse and place in plastic recycling. Check the resin identification "
                     "code (the number inside the recycling triangle) against local rules, "
                     "since not all plastics are accepted everywhere.",
        "reuse_ideas": [
            "Plastic bottles/containers can be reused for storage or as plant pots.",
            "Cut bottles can become funnels, scoops, or watering-can substitutes.",
            "Sturdy containers are useful for organizing small hardware, craft, or kitchen items.",
        ],
    },
    "shoes": {
        "category": "reusable / textile recycling",
        "disposal": "If wearable, donate. Some shoe brands and stores run take-back/recycling "
                     "programs for old shoes.",
        "reuse_ideas": [
            "Donate usable pairs to charity.",
            "Old shoes can be repurposed as planters for small plants.",
            "Worn-out sneakers are sometimes accepted by brand take-back programs to be recycled into court/track surfacing material.",
        ],
    },
    "trash": {
        "category": "general waste",
        "disposal": "Items like soiled tissues, certain packaging, or mixed materials that "
                     "can't be easily recycled or composted. Dispose of in general waste/landfill bin.",
        "reuse_ideas": [
            "Before discarding, double check the item can't be broken into recyclable parts (e.g., separating plastic wrap from a cardboard box).",
            "Consider if a similar item could be avoided next time (reduce at the source is the most effective step for this category).",
        ],
    },
}


def get_waste_info(predicted_class: str) -> dict:
    """Look up disposal + reuse info for a predicted class, with a safe fallback."""
    return WASTE_INFO.get(
        predicted_class,
        {
            "category": "unknown",
            "disposal": "Could not find specific guidance for this item — when in doubt, "
                        "check your local municipal waste guidelines.",
            "reuse_ideas": [],
        },
    )
