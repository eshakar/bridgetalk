// GENERATED from backend/app/data/sample_meeting.py. Do not edit by hand.
// Regenerate with `python -m app.data.export_sample` from backend/.
// SIMULATED DATA: fictional, hand-written transcript; not live transcription.
import type { Meeting } from "@/types/meeting";

export const SAMPLE_MEETING: Meeting = {
  "id": "lumen-beta-sync",
  "title": "Lumen Beta Launch Sync",
  "status": "completed",
  "date": "2026-10-26",
  "duration_seconds": 82,
  "is_simulated": true,
  "source_note": "Simulated sample meeting. Hand-written transcript and translations; not live transcription.",
  "languages": [
    {
      "code": "en",
      "label": "English",
      "native_label": "English"
    },
    {
      "code": "bn",
      "label": "Bengali",
      "native_label": "বাংলা"
    },
    {
      "code": "hi",
      "label": "Hindi",
      "native_label": "हिन्दी"
    }
  ],
  "speakers": [
    {
      "id": "priya",
      "name": "Priya Sharma",
      "role": "Product Lead",
      "primary_language": "en"
    },
    {
      "id": "rahul",
      "name": "Rahul Banerjee",
      "role": "Engineering Lead",
      "primary_language": "bn"
    },
    {
      "id": "ananya",
      "name": "Ananya Ghosh",
      "role": "Growth & Design",
      "primary_language": "bn"
    }
  ],
  "segments": [
    {
      "id": "s1",
      "speaker_id": "priya",
      "start_seconds": 0.0,
      "end_seconds": 7.0,
      "original_language": "en",
      "text": {
        "en": "Thanks for joining, everyone. Today we need to lock the plan for the Lumen beta launch.",
        "bn": "সবাইকে যোগ দেওয়ার জন্য ধন্যবাদ। আজ আমাদের লুমেন বিটা লঞ্চের পরিকল্পনা চূড়ান্ত করতে হবে।",
        "hi": "जुड़ने के लिए सभी का धन्यवाद। आज हमें ल्यूमेन बीटा लॉन्च की योजना तय करनी है।"
      }
    },
    {
      "id": "s2",
      "speaker_id": "rahul",
      "start_seconds": 7.0,
      "end_seconds": 15.0,
      "original_language": "bn",
      "text": {
        "bn": "অ্যান্ড্রয়েড বিল্ড প্রায় তৈরি। শুধু পেমেন্ট স্ক্রিনে দুটো বাগ বাকি আছে।",
        "en": "The Android build is almost ready. Only two bugs remain on the payment screen.",
        "hi": "एंड्रॉइड बिल्ड लगभग तैयार है। बस पेमेंट स्क्रीन पर दो बग बाकी हैं।"
      }
    },
    {
      "id": "s3",
      "speaker_id": "priya",
      "start_seconds": 15.0,
      "end_seconds": 23.0,
      "original_language": "en",
      "text": {
        "en": "Then let's decide: we launch the beta on Android first, and iOS follows later.",
        "bn": "তাহলে সিদ্ধান্ত নিই: আমরা প্রথমে অ্যান্ড্রয়েডে বিটা লঞ্চ করব, iOS পরে আসবে।",
        "hi": "तो चलिए तय करते हैं: हम पहले एंड्रॉइड पर बीटा लॉन्च करेंगे, iOS बाद में आएगा।"
      }
    },
    {
      "id": "s4",
      "speaker_id": "ananya",
      "start_seconds": 23.0,
      "end_seconds": 31.0,
      "original_language": "bn",
      "text": {
        "bn": "আমি একমত। আর বিটা শুধু আমন্ত্রিত পাঁচশো ব্যবহারকারীর জন্য থাকবে, তাই তো?",
        "en": "I agree. And the beta will be limited to five hundred invited users, right?",
        "hi": "मैं सहमत हूँ। और बीटा सिर्फ़ आमंत्रित पाँच सौ उपयोगकर्ताओं के लिए होगा, है ना?"
      }
    },
    {
      "id": "s5",
      "speaker_id": "priya",
      "start_seconds": 31.0,
      "end_seconds": 38.0,
      "original_language": "en",
      "text": {
        "en": "Yes, agreed. The beta is invite-only, five hundred users for the first wave.",
        "bn": "হ্যাঁ, সিদ্ধান্ত হলো। বিটা শুধু আমন্ত্রণের মাধ্যমে, প্রথম ধাপে পাঁচশো ব্যবহারকারী।",
        "hi": "हाँ, तय हुआ। बीटा सिर्फ़ आमंत्रण से होगा, पहले चरण में पाँच सौ उपयोगकर्ता।"
      }
    },
    {
      "id": "s6",
      "speaker_id": "rahul",
      "start_seconds": 38.0,
      "end_seconds": 45.0,
      "original_language": "bn",
      "text": {
        "bn": "আমি শুক্রবারের মধ্যে পেমেন্টের বাগ দুটো ঠিক করে দেব।",
        "en": "I will fix the two payment bugs by Friday.",
        "hi": "मैं शुक्रवार तक पेमेंट के दोनों बग ठीक कर दूँगा।"
      }
    },
    {
      "id": "s7",
      "speaker_id": "ananya",
      "start_seconds": 45.0,
      "end_seconds": 53.0,
      "original_language": "hi",
      "text": {
        "hi": "मैं बीटा यूज़र्स के लिए ऑनबोर्डिंग ईमेल का ड्राफ़्ट तैयार करूँगी।",
        "en": "I will prepare the draft of the onboarding email for beta users.",
        "bn": "আমি বিটা ব্যবহারকারীদের জন্য অনবোর্ডিং ইমেলের খসড়া তৈরি করব।"
      }
    },
    {
      "id": "s8",
      "speaker_id": "priya",
      "start_seconds": 53.0,
      "end_seconds": 61.0,
      "original_language": "en",
      "text": {
        "en": "Great. Someone also needs to update the Play Store screenshots before we go live.",
        "bn": "দারুণ। লাইভ হওয়ার আগে কাউকে প্লে স্টোরের স্ক্রিনশটগুলোও আপডেট করতে হবে।",
        "hi": "बढ़िया। लाइव होने से पहले किसी को प्ले स्टोर के स्क्रीनशॉट भी अपडेट करने होंगे।"
      }
    },
    {
      "id": "s9",
      "speaker_id": "rahul",
      "start_seconds": 61.0,
      "end_seconds": 68.0,
      "original_language": "bn",
      "text": {
        "bn": "একটা প্রশ্ন বাকি থাকল — বিটাতে কি প্রিমিয়াম ফিচারগুলো বিনামূল্যে থাকবে?",
        "en": "One question remains: will the premium features be free during the beta?",
        "hi": "एक सवाल बाकी है — क्या बीटा में प्रीमियम फ़ीचर मुफ़्त रहेंगे?"
      }
    },
    {
      "id": "s10",
      "speaker_id": "priya",
      "start_seconds": 68.0,
      "end_seconds": 76.0,
      "original_language": "en",
      "text": {
        "en": "Good question. I don't have an answer yet, so let's keep pricing open until we hear from finance.",
        "bn": "ভালো প্রশ্ন। এখনও আমার কাছে উত্তর নেই, তাই ফাইন্যান্সের মতামত না পাওয়া পর্যন্ত দামের বিষয়টা খোলা থাকুক।",
        "hi": "अच्छा सवाल है। अभी मेरे पास जवाब नहीं है, इसलिए फ़ाइनेंस से जवाब आने तक प्राइसिंग का मुद्दा खुला रखते हैं।"
      }
    },
    {
      "id": "s11",
      "speaker_id": "ananya",
      "start_seconds": 76.0,
      "end_seconds": 82.0,
      "original_language": "bn",
      "text": {
        "bn": "ঠিক আছে। তাহলে পরের সপ্তাহে আবার কথা হবে।",
        "en": "Okay. Then we'll talk again next week.",
        "hi": "ठीक है। तो अगले हफ़्ते फिर बात करेंगे।"
      }
    }
  ]
};
