"""Anonymized deterministic inputs and outputs for the PHK-01 demo."""

PRODUCT = {
    "product_id": "phk-01",
    "name": "Aurelia PHK-01 antique brass pendant light hardware kit",
    "knowledge_version": "PHK-01/master@4",
    "material": "steel substrate with AB-07 antique brass electroplated finish",
    "included": ["canopy", "mounting bracket", "chain", "threaded tube", "collars", "fasteners"],
    "excluded": ["lamp holder", "wire", "driver", "light source", "electrical certification"],
    "evidence_ids": ["product-master-v4", "assembly-bom-v3", "finish-ab07", "claims-guide-v2"],
}

BRIEF = {
    "keyword": "antique brass pendant light hardware kit manufacturer",
    "audience": "overseas lighting brands and procurement managers",
    "language": "English",
}

ARTICLE_WITH_KNOWN_ERRORS = (
    "Aurelia PHK-01 uses solid-brass construction and is a ready-to-install complete pendant light. "
    "Every batch is guaranteed to pass 500 hours of salt-spray testing."
)

CORRECTED_ARTICLE = (
    "Aurelia PHK-01 is a non-electrical pendant-light hardware kit made from steel components with "
    "the AB-07 antique-brass electroplated finish. It excludes the lamp holder, wire, driver, light "
    "source, and electrical certification. Finish-validation terms should be agreed against an "
    "approved sample and test method for each OEM program."
)
