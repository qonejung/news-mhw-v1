/** Quick integrity check for edit-friendly JSON sources. Run: node tools/verify-data.mjs */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base=resolve(import.meta.dirname,'..');
const read=(relative)=>JSON.parse(readFileSync(resolve(base,relative),'utf8'));
const articles=read('data/immigration-articles-complete.json');
const sets=read('data/immigration-news-sets.json');
const articleQuestions=read('data/article-questions.json');
const backgroundQuestions=read('data/background-questions.json');
const config=read('config/study-config.json');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

function checkQuestions(questions,source){
  assert(Array.isArray(questions)&&questions.length>0,`${source}: empty`);
  const ids=new Set();
  for(const q of questions){
    assert(typeof q.id==='string'&&q.id.length>0&&!ids.has(q.id),`${source}: duplicate/bad question ID ${q.id}`);
    ids.add(q.id);
    assert(typeof q.text==='string'&&q.text.length>0,`${source}: missing question text ${q.id}`);
    assert(Array.isArray(q.options)&&q.options.length>=2,`${source}: missing response options ${q.id}`);
    assert(q.options.every(opt=>typeof opt==='string'&&opt.length>0),`${source}: invalid option ${q.id}`);
  }
}
checkQuestions(articleQuestions,'article-questions.json');
checkQuestions(backgroundQuestions,'background-questions.json');

const byId=new Map();
for(const a of articles){
  assert(typeof a.id==='string'&&!byId.has(a.id),`Duplicate article ID ${a.id}`);
  assert(typeof a.title==='string'&&Array.isArray(a.body),`Incomplete article ${a.id}`);
  byId.set(a.id,a);
}
const setIds=new Set();
for(const set of sets){
  const id=Number(set.id);
  assert(Number.isInteger(id)&&!setIds.has(id),`Invalid/duplicate set ID ${set.id}`);
  setIds.add(id);
  assert(Array.isArray(set.news_set)&&set.news_set.length>0,`Empty news set ${set.id}`);
  for(const articleId of set.news_set) assert(byId.has(articleId),`Missing article ${articleId} in news set ${set.id}`);
}
assert(setIds.has(Number(config.newsSetId)),`Configured news set ID ${config.newsSetId} not found`);
console.log(`OK: ${articles.length} articles, ${sets.length} news sets, ${articleQuestions.length} article questions, ${backgroundQuestions.length} background questions.`);
