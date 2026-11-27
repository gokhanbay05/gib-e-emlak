from datetime import datetime, timedelta, timezone
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models import (
    Agency,
    Appointment,
    BlockedSlot,
    Customer,
    CustomerSearchRequest,
    Favorite,
    Property,
    User,
)


def init_db_and_seed() -> dict:
    """PostgreSQL tablolarını oluşturur ve boşsa gerçekçi başlangıç verilerini yükler."""
    Base.metadata.create_all(bind=engine)

    # Mevcut agencies tablosuna yapısal il/ilçe/mahalle sütunlarını güvenle ekle
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE agencies ADD COLUMN IF NOT EXISTS city VARCHAR(60)")
        )
        conn.execute(
            text("ALTER TABLE agencies ADD COLUMN IF NOT EXISTS district VARCHAR(80)")
        )
        conn.execute(
            text("ALTER TABLE agencies ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120)")
        )
        conn.execute(
            text(
                "UPDATE agencies SET city='Ankara', district='Çankaya', "
                "neighborhood='Kızılırmak Mah.' WHERE ttbs_document_no='0600482' AND city IS NULL"
            )
        )
        conn.execute(
            text(
                "UPDATE agencies SET city='İstanbul', district='Kadıköy', "
                "neighborhood='Suadiye Mah.' WHERE ttbs_document_no='3401925' AND city IS NULL"
            )
        )

    with SessionLocal() as db:
        existing_agency = db.scalar(select(Agency).limit(1))
        if existing_agency is not None:
            _ensure_extra_properties(db)
            return {"seeded": False, "message": "Veritabanında başlangıç verileri zaten mevcut."}

        res = _populate_seed_data(db)
        _ensure_extra_properties(db)
        return res


def _ensure_extra_properties(db: Session) -> None:
    """Veritabanında zengin sayfalama ve harita deneyimi için en az 24 aktif ilan bulunmasını sağlar."""
    all_props = list(db.scalars(select(Property)).all())
    if len(all_props) >= 22:
        return

    agencies = list(db.scalars(select(Agency).order_by(Agency.id)).all())
    customers = list(db.scalars(select(Customer).order_by(Customer.id)).all())
    if not agencies or not customers:
        return

    ag1 = agencies[0]
    ag2 = agencies[1] if len(agencies) > 1 else agencies[0]
    c1 = customers[0]
    c2 = customers[2] if len(customers) > 2 else customers[0]
    c_ist = customers[-1]

    extra_listings = [
        Property(
            agency_id=ag1.id,
            owner_customer_id=c2.id,
            title="Çankaya Gaziosmanpaşa'da Büyükelçilikler Yanı 4+1 Satılık Daire",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=210,
            net_sqm=185,
            room_count="4+1",
            floor_number=4,
            building_floors=6,
            heating_type="MERKEZI",
            price=11450000,
            city="Ankara",
            district="Çankaya",
            neighborhood="Gaziosmanpaşa Mah.",
            address_detail="Uğur Mumcu Cad. No:48/9 Çankaya/Ankara",
            agent_description="Panoramik Ankara manzaralı, çift asansörlü, kapalı otoparklı, geniş salonlu 4+1 daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c1.id,
            title="Çankaya Yıldız'da Sıfır Binada Güney Cephe 3+1 Kiralık Daire",
            listing_type="KIRALIK",
            property_type="DAIRE",
            gross_sqm=140,
            net_sqm=125,
            room_count="3+1",
            floor_number=5,
            building_floors=8,
            heating_type="DOGALGAZ_KOMBI",
            price=29500,
            city="Ankara",
            district="Çankaya",
            neighborhood="Yıldız Mah.",
            address_detail="Turan Güneş Bulvarı Yanı 412. Sok. No:6 Çankaya/Ankara",
            agent_description="3'lü ankastre setli, ebeveyn banyolu, giyinme odalı ve kapalı otoparklı sıfır kiralık daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c2.id,
            title="Yenimahalle Batıkent Çakırlar'da Havuzlu Sitede 3+1 Satılık",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=155,
            net_sqm=138,
            room_count="3+1",
            floor_number=7,
            building_floors=14,
            heating_type="MERKEZI",
            price=4950000,
            city="Ankara",
            district="Yenimahalle",
            neighborhood="Turgut Özal Mah.",
            address_detail="Çakırlar Çiftliği Cad. Prestij Park C Blok No:31 Yenimahalle/Ankara",
            agent_description="Geniş peyzajlı, güvenlikli, metro ring durağı önünde bakımlı aile dairesi.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c2.id,
            title="Etimesgut Eryaman Göksu Parkı Yakını 2+1 Satılık Yatırımlık Daire",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=95,
            net_sqm=82,
            room_count="2+1",
            floor_number=3,
            building_floors=10,
            heating_type="DOGALGAZ_KOMBI",
            price=3150000,
            city="Ankara",
            district="Etimesgut",
            neighborhood="Göksu Mah.",
            address_detail="Göksu Park Cad. No:15/12 Eryaman Etimesgut/Ankara",
            agent_description="Göksu Parkı ve AVM karşısında, yüksek kira getirili, kombili 2+1 ara kat daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c1.id,
            title="Çankaya Çukurambar'da Metroya 3 Dk Eşyalı 1+1 Kiralık Rezidans",
            listing_type="KIRALIK",
            property_type="DAIRE",
            gross_sqm=68,
            net_sqm=58,
            room_count="1+1",
            floor_number=11,
            building_floors=24,
            heating_type="YERDEN_ISITMA",
            price=24000,
            city="Ankara",
            district="Çankaya",
            neighborhood="Çukurambar Mah.",
            address_detail="Muhsin Yazıcıoğlu Cad. Via Tower Kat:11 Çankaya/Ankara",
            agent_description="Tüm beyaz eşyaları ve mobilyaları sıfır, 7/24 resepsiyonlu lüks 1+1 rezidans dairesi.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c2.id,
            title="Gölbaşı İncek Bulvarı Üzeri Ticari İmarlı Köşe Parsel Satılık Arsa",
            listing_type="SATILIK",
            property_type="ARSA",
            gross_sqm=850,
            net_sqm=850,
            room_count="1+0",
            floor_number=0,
            building_floors=0,
            heating_type="DOGALGAZ_KOMBI",
            price=12750000,
            city="Ankara",
            district="Gölbaşı",
            neighborhood="İncek Mah.",
            address_detail="İncek Bulvarı 2480. Cadde Köşesi Gölbaşı/Ankara",
            agent_description="Ana bulvara cepheli, 1.20 emsal imarlı, villa veya ticari plaza yapımına uygun müstakil tapulu arsa.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c2.id,
            title="Çankaya Beytepe'de Koru Manzaralı 4+1 Satılık Geniş Daire",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=220,
            net_sqm=192,
            room_count="4+1",
            floor_number=9,
            building_floors=16,
            heating_type="YERDEN_ISITMA",
            price=9850000,
            city="Ankara",
            district="Çankaya",
            neighborhood="Beytepe Mah.",
            address_detail="Kanuni Sultan Süleyman Bulvarı Beytepe Konakları A Blok Çankaya/Ankara",
            agent_description="Üniversite kampüslerine komşu, 2 araçlık kapalı garajlı, kış bahçeli lüks 4+1.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="Kadıköy Fenerbahçe Kalamış Marina Manzaralı 4+1 Satılık Daire",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=215,
            net_sqm=185,
            room_count="4+1",
            floor_number=7,
            building_floors=10,
            heating_type="YERDEN_ISITMA",
            price=24500000,
            city="İstanbul",
            district="Kadıköy",
            neighborhood="Fenerbahçe Mah.",
            address_detail="Fener Kalamış Cad. No:64/14 Kadıköy/İstanbul",
            agent_description="Kalamış Marina ve deniz manzaralı, geniş teras balkonlu, akıllı ev sistemli prestijli daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="Beşiktaş Etiler'de Metroya Yürüme Mesafesinde 3+1 Kiralık Daire",
            listing_type="KIRALIK",
            property_type="DAIRE",
            gross_sqm=145,
            net_sqm=128,
            room_count="3+1",
            floor_number=3,
            building_floors=5,
            heating_type="DOGALGAZ_KOMBI",
            price=55000,
            city="İstanbul",
            district="Beşiktaş",
            neighborhood="Etiler Mah.",
            address_detail="Nispetiye Cad. Seher Yıldızı Sok. No:12 Beşiktaş/İstanbul",
            agent_description="Akmerkez ve Etiler metro durağına 4 dakika yürüme mesafesinde, otoparklı, komple yenilenmiş daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="Ataşehir Finans Merkezi Yanı Kurumsal Kiralık Plaza Ofisi",
            listing_type="KIRALIK",
            property_type="ISYERI",
            gross_sqm=180,
            net_sqm=160,
            room_count="3+1",
            floor_number=14,
            building_floors=28,
            heating_type="MERKEZI",
            price=72000,
            city="İstanbul",
            district="Ataşehir",
            neighborhood="Barbaros Mah.",
            address_detail="Mor Sümbül Sok. Finans Kule Kat:14 Ataşehir/İstanbul",
            agent_description="İstanbul Finans Merkezi karşısında, 4 araçlık tahsisli kapalı otoparklı, dekorasyonlu köşe ofis.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="Sarıyer Zekeriyaköy'de Müstakil Havuzlu 5+1 Satılık Orman Villası",
            listing_type="SATILIK",
            property_type="VILLA",
            gross_sqm=380,
            net_sqm=330,
            room_count="5+1",
            floor_number=1,
            building_floors=3,
            heating_type="YERDEN_ISITMA",
            price=29800000,
            city="İstanbul",
            district="Sarıyer",
            neighborhood="Zekeriyaköy Mah.",
            address_detail="Ormanada Yakını 4. Cadde No:9 Sarıyer/İstanbul",
            agent_description="Belgrad Ormanı komşuluğunda, ısıtmalı özel yüzme havuzlu ve şömineli müstakil villa.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="Üsküdar Acıbadem'de Metro ve Metrobüse Yakın 2+1 Kiralık Daire",
            listing_type="KIRALIK",
            property_type="DAIRE",
            gross_sqm=100,
            net_sqm=88,
            room_count="2+1",
            floor_number=2,
            building_floors=5,
            heating_type="DOGALGAZ_KOMBI",
            price=34000,
            city="İstanbul",
            district="Üsküdar",
            neighborhood="Acıbadem Mah.",
            address_detail="Acıbadem Cad. Tekin Sok. No:7/4 Üsküdar/İstanbul",
            agent_description="Acıbadem Hastanesi ve metro durağına yürüme mesafesinde, nezih apartmanda balkonlu 2+1.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="İzmir Karşıyaka Bostanlı Sahilde Deniz Cepheli 3+1 Satılık Daire",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=160,
            net_sqm=142,
            room_count="3+1",
            floor_number=5,
            building_floors=7,
            heating_type="DOGALGAZ_KOMBI",
            price=8950000,
            city="İzmir",
            district="Karşıyaka",
            neighborhood="Bostanlı Mah.",
            address_detail="Cemal Gürsel Cad. Sahil Apt. No:112/10 Karşıyaka/İzmir",
            agent_description="Bostanlı vapur iskelesi ve tramvay durağına 2 dakika, kapanmaz körfez manzaralı geniş 3+1.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="İzmir Bornova Özkanlar'da Metroya Yakın 2+1 Kiralık Daire",
            listing_type="KIRALIK",
            property_type="DAIRE",
            gross_sqm=105,
            net_sqm=90,
            room_count="2+1",
            floor_number=3,
            building_floors=7,
            heating_type="DOGALGAZ_KOMBI",
            price=23500,
            city="İzmir",
            district="Bornova",
            neighborhood="Kazımdirik Mah.",
            address_detail="Mustafa Kemal Cad. No:44/8 Bornova/İzmir",
            agent_description="Ege Üniversitesi ve Bölge metrosuna yürüme mesafesinde, açık mutfaklı modern 2+1 daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900",
        ),
        Property(
            agency_id=ag2.id,
            owner_customer_id=c_ist.id,
            title="İzmir Çeşme Alaçatı'da Taş Mimari Müstakil Havuzlu 4+1 Satılık Villa",
            listing_type="SATILIK",
            property_type="VILLA",
            gross_sqm=240,
            net_sqm=210,
            room_count="4+1",
            floor_number=1,
            building_floors=2,
            heating_type="YERDEN_ISITMA",
            price=19500000,
            city="İzmir",
            district="Çeşme",
            neighborhood="Alaçatı Mah.",
            address_detail="Alaçatı Çamlık Yolu 14012. Sok. No:4 Çeşme/İzmir",
            agent_description="Doğal Alaçatı taşıyla inşa edilmiş, şömineli, yerden ısıtmalı, yaz-kış oturuma uygun havuzlu taş villa.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900",
        ),
        Property(
            agency_id=ag1.id,
            owner_customer_id=c2.id,
            title="Antalya Konyaaltı Hurma'da Denize Yakın Havuzlu Sitede 2+1 Satılık",
            listing_type="SATILIK",
            property_type="DAIRE",
            gross_sqm=110,
            net_sqm=96,
            room_count="2+1",
            floor_number=2,
            building_floors=5,
            heating_type="KLIMA",
            price=5250000,
            city="Antalya",
            district="Konyaaltı",
            neighborhood="Hurma Mah.",
            address_detail="Boğaçayı Cad. Akdeniz Park Sitesi B Blok Konyaaltı/Antalya",
            agent_description="Konyaaltı plajına bisiklet mesafesinde, yüzme havuzlu ve klimalı ferah 2+1 daire.",
            status="AKTIF",
            is_owner_id_verified=True,
            image_url="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900",
        ),
    ]
    db.add_all(extra_listings)
    db.commit()


def _populate_seed_data(db: Session) -> dict:
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    # 1. İşyeri Tanımları (Agencies)
    agency1 = Agency(
        name="Başkent Vizyon Gayrimenkul A.Ş.",
        authorized_person="Selim Karahan",
        address="Kızılırmak Mah. Dumlupınar Blv. Next Level A Blok No:3/42 Çankaya / Ankara",
        phone="0312 468 10 20",
        mobile_phone="0532 411 22 33",
        fax="0312 468 10 21",
        tax_office="Çankaya Vergi Dairesi",
        tax_number="1480923411",
        ttbs_document_no="0600482",
        is_ttbs_verified=True,
        logo_url="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200",
        description=(
            "Ankara Çankaya, İncek ve Çayyolu bölgelerinde Ticaret Bakanlığı Taşınmaz "
            "Ticareti Yetki Belgeli kurumsal gayrimenkul danışmanlık ofisi."
        ),
    )
    agency2 = Agency(
        name="Boğaziçi Prestij Emlak Danışmanlık",
        authorized_person="Ayşe Demirci",
        address="Suadiye Mah. Bağdat Cad. No:312/4 Kadıköy / İstanbul",
        phone="0216 355 40 50",
        mobile_phone="0544 355 40 50",
        fax="0216 355 40 51",
        tax_office="Kadıköy Vergi Dairesi",
        tax_number="1920458712",
        ttbs_document_no="3401925",
        is_ttbs_verified=True,
        logo_url="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200",
        description=(
            "İstanbul Anadolu Yakası konut, ticari işyeri ve yatırım portföyü "
            "uzmanı yetki belgeli emlak işletmesi."
        ),
    )
    db.add_all([agency1, agency2])
    db.flush()

    # 2. Müşteriler (Customers — Alıcı, Satıcı, Kiralık Mülk Sahibi, Kiracı)
    c_mehmet = Customer(
        agency_id=agency1.id,
        first_name="Mehmet",
        last_name="Özkan",
        mobile_phone="0533 210 44 55",
        home_phone="0312 426 11 22",
        email="mehmet.ozkan@ornekmail.com",
        tc_identity_no="14582930412",
        is_tc_verified=True,
        customer_type="KIRALAYAN",
        source="MANUEL",
        notes="GİB Senaryosu 1. Müşteri (Kiralık daire sahibi). Düzenli kiracı ve kamu personeli tercih ediyor.",
    )
    c_zeynep = Customer(
        agency_id=agency1.id,
        first_name="Zeynep",
        last_name="Kaya",
        mobile_phone="0542 612 88 99",
        home_phone="0312 440 33 11",
        email="zeynep.kaya@ornekmail.com",
        tc_identity_no="29481029384",
        is_tc_verified=True,
        customer_type="KIRACI",
        source="SELF_KAYIT",
        notes="GİB Senaryosu 2. Müşteri (Kiralık 3+1 kombili ara kat daire arıyor).",
    )
    c_ahmet = Customer(
        agency_id=agency1.id,
        first_name="Ahmet",
        last_name="Çelik",
        mobile_phone="0532 811 70 60",
        home_phone="0312 285 90 10",
        email="ahmet.celik@ornekmail.com",
        tc_identity_no="38192049582",
        is_tc_verified=True,
        customer_type="SATICI",
        source="MANUEL",
        notes="Çayyolu ve Bahçelievler bölgesinde satılık daire ve villa mülk sahibi.",
    )
    c_burak = Customer(
        agency_id=agency1.id,
        first_name="Burak",
        last_name="Yılmaz",
        mobile_phone="0535 900 12 34",
        home_phone="0312 490 55 66",
        email="burak.yilmaz@ornekmail.com",
        tc_identity_no="47281930496",
        is_tc_verified=True,
        customer_type="ALICI",
        source="SELF_KAYIT",
        notes="Yatırımlık veya aileye uygun geniş 3+1 / 4+1 satılık konut arıyor.",
    )
    c_elif = Customer(
        agency_id=agency1.id,
        first_name="Elif",
        last_name="Aydın",
        mobile_phone="0543 321 65 43",
        home_phone="0312 419 77 88",
        email="elif.aydin@ornekmail.com",
        tc_identity_no="62839401928",
        is_tc_verified=True,
        customer_type="KIRALAYAN",
        source="MANUEL",
        notes="Söğütözü'nde kurumsal kiracıya uygun kiralık ofis/işyeri sahibi.",
    )
    c_hakan = Customer(
        agency_id=agency2.id,
        first_name="Hakan",
        last_name="Şahin",
        mobile_phone="0530 770 80 90",
        home_phone="0216 348 12 13",
        email="hakan.sahin@ornekmail.com",
        tc_identity_no="51928374650",
        is_tc_verified=True,
        customer_type="SATICI",
        source="MANUEL",
        notes="Kadıköy Suadiye ve Fenerbahçe'de iki adet mülkü bulunan satıcı müşteri.",
    )
    db.add_all([c_mehmet, c_zeynep, c_ahmet, c_burak, c_elif, c_hakan])
    db.flush()

    # 3. Kullanıcı Hesapları (Users)
    u_agent1 = User(
        full_name="Selim Karahan",
        email="selim@baskentvizyon.com.tr",
        password_hash="demo_hash_emlakci_1",
        phone="0532 411 22 33",
        role="AGENT",
        agency_id=agency1.id,
    )
    u_agent2 = User(
        full_name="Ayşe Demirci",
        email="ayse@bogaziciprestij.com.tr",
        password_hash="demo_hash_emlakci_2",
        phone="0544 355 40 50",
        role="AGENT",
        agency_id=agency2.id,
    )
    u_cust_zeynep = User(
        full_name="Zeynep Kaya",
        email="zeynep.kaya@ornekmail.com",
        password_hash="demo_hash_musteri_1",
        phone="0542 612 88 99",
        role="CUSTOMER",
        customer_id=c_zeynep.id,
    )
    u_cust_burak = User(
        full_name="Burak Yılmaz",
        email="burak.yilmaz@ornekmail.com",
        password_hash="demo_hash_musteri_2",
        phone="0535 900 12 34",
        role="CUSTOMER",
        customer_id=c_burak.id,
    )
    db.add_all([u_agent1, u_agent2, u_cust_zeynep, u_cust_burak])
    db.flush()

    # 4. Emlak / Portföy Kayıtları (Properties — BR-03: Sahipsiz ev yok)
    p1 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_mehmet.id,
        title="Çankaya Ayrancı'da Metroya Yakın Güneş Gören 3+1 Kiralık Daire",
        listing_type="KIRALIK",
        property_type="DAIRE",
        gross_sqm=135,
        net_sqm=120,
        room_count="3+1",
        floor_number=3,
        building_floors=5,
        heating_type="DOGALGAZ_KOMBI",
        price=26500,
        city="Ankara",
        district="Çankaya",
        neighborhood="Ayrancı Mah.",
        address_detail="Hoşdere Cad. Güvenlik Sok. No:14 Daire:7 Çankaya/Ankara",
        agent_description=(
            "Güney-doğu cepheli, tüm gün güneş gören, geniş cam balkonlu, kombi doğalgazlı, "
            "asansörlü ve kapalı otoparklı bakımlı ara kat aile dairesi. Kamu kurumlarına, "
            "metro durağına ve park alanına yürüyüş mesafesindedir."
        ),
        status="AKTIF",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    )
    p2 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_mehmet.id,
        title="Bahçelievler 7. Cadde Yakını Öğrenci ve Memura Uygun 2+1 Kiralık",
        listing_type="KIRALIK",
        property_type="DAIRE",
        gross_sqm=95,
        net_sqm=85,
        room_count="2+1",
        floor_number=2,
        building_floors=4,
        heating_type="MERKEZI",
        price=21000,
        city="Ankara",
        district="Çankaya",
        neighborhood="Bahçelievler Mah.",
        address_detail="54. Sokak No:8/5 Bahçelievler Çankaya/Ankara",
        agent_description=(
            "Merkezi ısınmalı, ısı yalıtımlı, mutfağı yenilenmiş, metroya ve üniversite "
            "kampüslerine 5 dakika yürüme mesafesinde sessiz sokakta 2+1 ara kat daire."
        ),
        status="AKTIF",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    )
    p3 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_ahmet.id,
        title="Çayyolu Alacaatlı'da Güvenlikli Site İçi 4+1 Satılık Lüks Daire",
        listing_type="SATILIK",
        property_type="DAIRE",
        gross_sqm=195,
        net_sqm=175,
        room_count="4+1",
        floor_number=6,
        building_floors=12,
        heating_type="YERDEN_ISITMA",
        price=7850000,
        city="Ankara",
        district="Çankaya",
        neighborhood="Alacaatlı Mah.",
        address_detail="Alacaatlı Cad. Park Konutları B Blok Kat:6 No:24 Çankaya/Ankara",
        agent_description=(
            "7/24 güvenlikli, kapalı yüzme havuzlu ve çocuk oyun alanlı prestijli sitede, "
            "yerden ısıtmalı, ebeveyn banyolu, çift balkonlu, geniş peyzaj manzaralı 4+1 daire."
        ),
        status="AKTIF",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    )
    p4 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_ahmet.id,
        title="İncek'te Müstakil Bahçeli Şömineli 5+1 Satılık Modern Villa",
        listing_type="SATILIK",
        property_type="VILLA",
        gross_sqm=340,
        net_sqm=295,
        room_count="5+1",
        floor_number=1,
        building_floors=3,
        heating_type="YERDEN_ISITMA",
        price=16500000,
        city="Ankara",
        district="Gölbaşı",
        neighborhood="İncek Mah.",
        address_detail="İncek Bulvarı Doğa Villaları No:12 Gölbaşı/Ankara",
        agent_description=(
            "500 m² müstakil bahçe kullanım alanına sahip, akıllı ev sistemli, yerden ısıtmalı, "
            "şömineli ve kış bahçeli, doğayla iç içe müstakil aile villası."
        ),
        status="AKTIF",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    )
    p5 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_elif.id,
        title="Söğütözü Plazalar Bölgesinde Kurumsal Kiralık 2+1 Ofis & İşyeri",
        listing_type="KIRALIK",
        property_type="ISYERI",
        gross_sqm=140,
        net_sqm=125,
        room_count="2+1",
        floor_number=8,
        building_floors=18,
        heating_type="MERKEZI",
        price=48000,
        city="Ankara",
        district="Çankaya",
        neighborhood="Söğütözü Mah.",
        address_detail="Eskişehir Yolu Armada Yanı İş Merkezi Kat:8 No:84 Çankaya/Ankara",
        agent_description=(
            "Metro çıkışında, jeneratörlü, resepsiyon ve otopark hizmetli A+ plazada "
            "toplantı odası hazır, cam bölmeli kurumsal ofis katı."
        ),
        status="AKTIF",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    )
    p6 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_ahmet.id,
        title="Oran'da Orman Manzaralı 3+1 Satılık Daire (Satışı Tamamlandı)",
        listing_type="SATILIK",
        property_type="DAIRE",
        gross_sqm=145,
        net_sqm=130,
        room_count="3+1",
        floor_number=4,
        building_floors=8,
        heating_type="DOGALGAZ_KOMBI",
        price=5400000,
        city="Ankara",
        district="Çankaya",
        neighborhood="Oran Mah.",
        address_detail="Zülfü Tiğrel Cad. No:22/11 Çankaya/Ankara",
        agent_description="Eymir ve ODTÜ ormanı cepheli, kombili, ferah 3+1 satılmış portföy kaydı.",
        status="SATILDI",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    )
    p7 = Property(
        agency_id=agency1.id,
        owner_customer_id=c_mehmet.id,
        title="Dikmen Vadisi Yakını 2+1 Kiralık Daire (Kiralama Tamamlandı)",
        listing_type="KIRALIK",
        property_type="DAIRE",
        gross_sqm=105,
        net_sqm=92,
        room_count="2+1",
        floor_number=2,
        building_floors=6,
        heating_type="DOGALGAZ_KOMBI",
        price=19500,
        city="Ankara",
        district="Çankaya",
        neighborhood="İlkadım Mah.",
        address_detail="Dikmen Cad. No:118/4 Çankaya/Ankara",
        agent_description="Vadi yürüyüş yoluna yakın, kombili, kiralama işlemi tamamlanmış 2+1 daire.",
        status="KIRALANDI",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    )
    p8 = Property(
        agency_id=agency2.id,
        owner_customer_id=c_hakan.id,
        title="Kadıköy Suadiye Bağdat Caddesi'ne 2. Bina 3+1 Satılık Daire",
        listing_type="SATILIK",
        property_type="DAIRE",
        gross_sqm=150,
        net_sqm=132,
        room_count="3+1",
        floor_number=5,
        building_floors=9,
        heating_type="DOGALGAZ_KOMBI",
        price=14900000,
        city="İstanbul",
        district="Kadıköy",
        neighborhood="Suadiye Mah.",
        address_detail="Plaj Yolu Sok. No:19 Daire:10 Kadıköy/İstanbul",
        agent_description=(
            "Bağdat Caddesi ve sahil yürüyüş yoluna 2 dakika mesafede, yeni deprem yönetmeliğine "
            "uygun binada, kapalı otoparklı ve ankastre mutfaklı aydınlık 3+1 daire."
        ),
        status="AKTIF",
        is_owner_id_verified=True,
        image_url="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    )
    db.add_all([p1, p2, p3, p4, p5, p6, p7, p8])
    db.flush()

    # 5. Müşteri Emlak Arama Talepleri (GİB Madde 4 & Altın Senaryo)
    req1 = CustomerSearchRequest(
        agency_id=agency1.id,
        customer_id=c_zeynep.id,
        listing_type="KIRALIK",
        property_type="DAIRE",
        min_sqm=110,
        max_sqm=150,
        room_count="3+1",
        floor_preference=3,
        heating_type="DOGALGAZ_KOMBI",
        min_price=20000,
        max_price=30000,
        city="Ankara",
        district="Çankaya",
        natural_language_prompt=(
            "Çankaya'da metroya ve kamu kurumlarına yakın, güneş gören, geniş balkonlu, "
            "doğalgaz kombili 3+1 ara kat kiralık aile dairesi arıyorum."
        ),
    )
    req2 = CustomerSearchRequest(
        agency_id=agency1.id,
        customer_id=c_burak.id,
        listing_type="SATILIK",
        property_type="DAIRE",
        min_sqm=160,
        max_sqm=220,
        room_count="4+1",
        heating_type="YERDEN_ISITMA",
        min_price=6000000,
        max_price=9000000,
        city="Ankara",
        district="Çankaya",
        natural_language_prompt=(
            "Güvenlikli site içinde, çocuk oyun alanı ve otoparkı olan, yerden ısıtmalı "
            "en az 4+1 geniş satılık daire."
        ),
    )
    db.add_all([req1, req2])

    # 6. Randevular (Appointments — Geçmiş Notlu, Yakın Tarihli ve İleri Tarihli)
    appt_past = Appointment(
        agency_id=agency1.id,
        property_id=p1.id,
        customer_id=c_zeynep.id,
        appointment_type="FIZIKI",
        purpose="ILAN_GOSTERIMI",
        start_time=now - timedelta(days=2, hours=3),
        end_time=now - timedelta(days=2, hours=2),
        status="TAMAMLANDI",
        meeting_notes=(
            "Zeynep Hanım daireyi yerinde gördü. Güneş almasını ve metro yakınlığını çok beğendi, "
            "kira kontratı şartlarını eşiyle değerlendirip dönüş yapacak."
        ),
    )
    appt_soon_locked = Appointment(
        agency_id=agency1.id,
        property_id=p3.id,
        customer_id=c_burak.id,
        appointment_type="FIZIKI",
        purpose="ILAN_GOSTERIMI",
        start_time=now + timedelta(hours=3),
        end_time=now + timedelta(hours=4),
        status="AKTIF",
        meeting_notes="6 saatten az kaldığı için BR-07 kuralı gereği iptal kilitlidir.",
    )
    appt_future = Appointment(
        agency_id=agency1.id,
        property_id=p2.id,
        customer_id=c_zeynep.id,
        appointment_type="TELEFON",
        purpose="GENEL_DANISMANLIK",
        start_time=now + timedelta(days=1, hours=2),
        end_time=now + timedelta(days=1, hours=3),
        status="AKTIF",
    )
    db.add_all([appt_past, appt_soon_locked, appt_future])

    # 7. Emlakçının Manuel Kapattığı Saat Dilimleri (Blocked Slots — örn: 19:00-20:00)
    today_19 = now.replace(hour=19, minute=0, second=0, microsecond=0)
    blocked1 = BlockedSlot(
        agency_id=agency1.id,
        start_time=today_19,
        end_time=today_19 + timedelta(hours=1),
        reason="19:00 - 20:00 Akşam Saatleri Manuel Kapalı",
    )
    blocked2 = BlockedSlot(
        agency_id=agency1.id,
        start_time=today_19 + timedelta(days=1),
        end_time=today_19 + timedelta(days=1, hours=1),
        reason="19:00 - 20:00 Tapu & Ofis Kapanış Saati (Manuel Bloklu)",
    )
    db.add_all([blocked1, blocked2])

    # 8. Favoriler (Favorites)
    fav1 = Favorite(user_id=u_cust_zeynep.id, property_id=p1.id)
    fav2 = Favorite(user_id=u_cust_burak.id, property_id=p3.id)
    db.add_all([fav1, fav2])

    db.commit()
    return {
        "seeded": True,
        "message": "8 PostgreSQL tablosu oluşturuldu ve gerçekçi başlangıç verileri yüklendi.",
    }


if __name__ == "__main__":
    result = init_db_and_seed()
    print(result["message"])
