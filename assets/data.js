/** Load editable study inputs and resolve the article order for a news set. */
export async function loadStudyData() {
  // The standalone preview embeds the same JSON data; the deployed site fetches the files.
  if (window.__CSS_ARTICLE_SURVEY_PREVIEW_DATA__) {
    const bundled=window.__CSS_ARTICLE_SURVEY_PREVIEW_DATA__;
    return {config:bundled.config, articles:bundled.articles, newsSets:bundled.newsSets,
      articleQuestions:bundled.articleQuestions, backgroundQuestions:bundled.backgroundQuestions};
  }
  const paths={
    config:'./config/study-config.json',
    articles:'./data/immigration-articles-complete.json',
    newsSets:'./data/immigration-news-sets.json',
    articleQuestions:'./data/article-questions.json',
    backgroundQuestions:'./data/background-questions.json'
  };
  const results=await Promise.all(Object.entries(paths).map(async ([key,path])=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`Unable to fetch ${path} (HTTP ${response.status})`);
    return [key, await response.json()];
  }));
  return Object.fromEntries(results);
}

export function validateQuestions(questions, filename) {
  if(!Array.isArray(questions)||!questions.length) throw new Error(`${filename} should contain a nonempty array.`);
  const seen=new Set();
  for(const question of questions){
    if(typeof question.id!=='string'||!question.id||seen.has(question.id)||
       typeof question.text!=='string'||!Array.isArray(question.options)||!question.options.length){
      throw new Error(`Invalid or duplicate question in ${filename}.`);
    }
    seen.add(question.id);
  }
  return questions;
}

export function chooseArticles(setId, {newsSetMap, newsSets, byId, studyConfig}, preferredOrder=null) {
  const set=newsSetMap.get(Number(setId));
  if(!set)throw new Error(`Unknown news set ID: ${setId}. Available IDs: ${newsSets.map(s=>s.id).join(', ')}`);
  const requested=set.news_set;
  if(!Array.isArray(requested)||!requested.length)throw new Error(`News set ${setId} has no articles.`);
  const missing=requested.filter(id=>!byId[id]);
  if(missing.length)throw new Error(`News set ${setId} contains unknown article IDs: ${missing.join(', ')}`);
  let selected=requested.map(id=>byId[id]);
  const max=Number(studyConfig.maxArticles);
  if(Number.isFinite(max)&&max>=1)selected=selected.slice(0,Math.floor(max));
  if(studyConfig.shuffleArticles){
    const ids=selected.map(a=>a.id);
    // A resumed survey retains its original randomized order.
    if(Array.isArray(preferredOrder)&&preferredOrder.length===ids.length&&preferredOrder.every(id=>ids.includes(id))){selected=preferredOrder.map(id=>byId[id]);}
    else for(let i=selected.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];}
  }
  return selected;
}
