"""Cities the platform syncs live public-works data for, plus official grievance channels.

Bounding boxes are (south, west, north, east). Add a city here and it is
picked up by the OSM sync, the map, and the city dashboard automatically.
"""
from __future__ import annotations

CITIES: dict[str, dict] = {
    "mumbai": {
        "name": "Mumbai", "state": "Maharashtra", "bbox": (18.89, 72.77, 19.30, 73.05),
        "center": (19.076, 72.8777), "zoom": 11,
        "body": "Brihanmumbai Municipal Corporation (BMC)",
        "grievance": {"label": "MCGM 24x7 helpline / complaint portal", "url": "https://portal.mcgm.gov.in"},
        "tender": {"label": "Maharashtra e-Tender", "url": "https://mahatenders.gov.in"},
    },
    "delhi": {
        "name": "Delhi", "state": "Delhi", "bbox": (28.40, 76.84, 28.88, 77.35),
        "center": (28.6139, 77.2090), "zoom": 10.5,
        "body": "MCD / NDMC / PWD Delhi",
        "grievance": {"label": "Delhi Public Grievance (PGMS)", "url": "https://pgms.delhi.gov.in"},
        "tender": {"label": "Delhi e-Procurement", "url": "https://govtprocurement.delhi.gov.in"},
    },
    "bengaluru": {
        "name": "Bengaluru", "state": "Karnataka", "bbox": (12.83, 77.46, 13.14, 77.78),
        "center": (12.9716, 77.5946), "zoom": 11,
        "body": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
        "grievance": {"label": "Sahaaya 2.0 (BBMP)", "url": "https://bbmp.gov.in"},
        "tender": {"label": "Karnataka Public Procurement Portal", "url": "https://kppp.karnataka.gov.in"},
    },
    "chennai": {
        "name": "Chennai", "state": "Tamil Nadu", "bbox": (12.90, 80.10, 13.25, 80.34),
        "center": (13.0827, 80.2707), "zoom": 11,
        "body": "Greater Chennai Corporation",
        "grievance": {"label": "Namma Chennai", "url": "https://chennaicorporation.gov.in"},
        "tender": {"label": "Tamil Nadu Tenders", "url": "https://tntenders.gov.in"},
    },
    "kolkata": {
        "name": "Kolkata", "state": "West Bengal", "bbox": (22.45, 88.25, 22.68, 88.48),
        "center": (22.5726, 88.3639), "zoom": 11,
        "body": "Kolkata Municipal Corporation",
        "grievance": {"label": "KMC Grievance", "url": "https://www.kmcgov.in"},
        "tender": {"label": "West Bengal e-Tenders", "url": "https://wbtenders.gov.in"},
    },
    "hyderabad": {
        "name": "Hyderabad", "state": "Telangana", "bbox": (17.28, 78.28, 17.56, 78.62),
        "center": (17.385, 78.4867), "zoom": 11,
        "body": "Greater Hyderabad Municipal Corporation (GHMC)",
        "grievance": {"label": "GHMC Grievance", "url": "https://www.ghmc.gov.in"},
        "tender": {"label": "Telangana e-Procurement", "url": "https://tender.telangana.gov.in"},
    },
    "pune": {
        "name": "Pune", "state": "Maharashtra", "bbox": (18.42, 73.75, 18.62, 73.98),
        "center": (18.5204, 73.8567), "zoom": 11,
        "body": "Pune Municipal Corporation (PMC)",
        "grievance": {"label": "PMC CARE", "url": "https://pmc.gov.in"},
        "tender": {"label": "Maharashtra e-Tender", "url": "https://mahatenders.gov.in"},
    },
    "ahmedabad": {
        "name": "Ahmedabad", "state": "Gujarat", "bbox": (22.90, 72.45, 23.15, 72.72),
        "center": (23.0225, 72.5714), "zoom": 11,
        "body": "Ahmedabad Municipal Corporation (AMC)",
        "grievance": {"label": "AMC Complaints", "url": "https://ahmedabadcity.gov.in"},
        "tender": {"label": "Gujarat nProcure", "url": "https://tender.nprocure.com"},
    },
    "lucknow": {
        "name": "Lucknow", "state": "Uttar Pradesh", "bbox": (26.72, 80.85, 26.97, 81.08),
        "center": (26.8467, 80.9462), "zoom": 11,
        "body": "Lucknow Municipal Corporation",
        "grievance": {"label": "IGRS Uttar Pradesh", "url": "https://jansunwai.up.nic.in"},
        "tender": {"label": "UP e-Tender", "url": "https://etender.up.nic.in"},
    },
    "jaipur": {
        "name": "Jaipur", "state": "Rajasthan", "bbox": (26.78, 75.68, 27.03, 75.92),
        "center": (26.9124, 75.7873), "zoom": 11,
        "body": "Jaipur Municipal Corporation",
        "grievance": {"label": "Rajasthan Sampark", "url": "https://sampark.rajasthan.gov.in"},
        "tender": {"label": "Rajasthan e-Procurement", "url": "https://eproc.rajasthan.gov.in"},
    },
}

NATIONAL_LINKS = {
    "rti": {"label": "RTI Online (Central Government)", "url": "https://rtionline.gov.in"},
    "cpgrams": {"label": "CPGRAMS (Central grievances)", "url": "https://pgportal.gov.in"},
    "cppp": {"label": "Central Public Procurement Portal", "url": "https://eprocure.gov.in"},
    "gem": {"label": "Government e-Marketplace", "url": "https://gem.gov.in"},
    "ogd": {"label": "Open Government Data Platform India", "url": "https://data.gov.in"},
}


def city_for_point(lat: float, lng: float) -> str | None:
    for slug, c in CITIES.items():
        s, w, n, e = c["bbox"]
        if s <= lat <= n and w <= lng <= e:
            return slug
    return None
