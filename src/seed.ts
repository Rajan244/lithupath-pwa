import { db, type CourseItem } from './db';

export async function seedDatabaseIfEmpty() {
  const count = await db.course_items.count();
  
  if (count > 0) {
    console.log(`Database already seeded with ${count} items.`);
    return;
  }

  console.log('Fetching syllabus data for initial seed...');
  
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}lithuanian_30_day_syllabus.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const data = await response.json();
    const allItems: CourseItem[] = [];
    
    // Support either a flat items array or a nested lessons array
    const rawItems = Array.isArray(data.items) ? data.items : [];
    
    for (const item of rawItems) {
      allItems.push({
        item_id: item.syllabus_item_id || item.id || `lt_${Math.random().toString(36).substr(2, 9)}`,
        lt: item.lithuanian || item.lt,
        en: item.english || item.en,
        type: item.type || 'word',
        level: item.level || 'A1',
        topic: item.daily_theme || item.topic || 'General',
        day: item.day || 1,
        importance: item.importance || 5,
        tags: item.tags || [],
        quiz_modes: item.test_modes || ['recognition'],
        grammar_note: item.grammar?.notes || item.grammar_note,
        mnemonic: item.mnemonic,
        pattern: item.pattern,
        formality: item.usage?.formality,
        example_lt: item.usage?.example_lt,
        example_en: item.usage?.example_en,
        literal_translation: item.usage?.literal_translation
      });
    }

    // Fallback for nested structure if items is empty
    if (allItems.length === 0) {
      for (const dayData of data.days || data.lessons || []) {
        for (const item of dayData.items || []) {
          allItems.push({
            item_id: item.id || `lt_${Math.random().toString(36).substr(2, 9)}`,
            lt: item.lithuanian || item.lt,
            en: item.english || item.en,
            type: item.type || 'word',
            level: item.level || dayData.level || 'A1',
            topic: item.topic || dayData.topic || dayData.category || 'General',
            day: item.day || dayData.day || dayData.lesson_id,
            importance: item.importance || 5,
            tags: item.tags || [],
            quiz_modes: item.quiz_modes || ['recognition', 'production'],
            grammar_note: item.grammar_note || item.grammar,
            mnemonic: item.mnemonic,
            pattern: item.pattern,
            formality: item.usage?.formality,
            example_lt: item.usage?.example_lt,
            example_en: item.usage?.example_en,
            literal_translation: item.usage?.literal_translation
          });
        }
      }
    }

    console.log(`Parsed ${allItems.length} items. Bulk adding to IndexedDB...`);
    
    await db.transaction('rw', db.course_items, async () => {
      await db.course_items.bulkAdd(allItems);
    });

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Error during database seeding:', err);
  }
}
