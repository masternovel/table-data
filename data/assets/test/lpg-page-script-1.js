/* LPG Price Script v1.0 - Performance Optimized */
(function(){"use strict";

/* CFG Check */
if(typeof CFG==="undefined"){console.error("CFG not found");return}

/* Config */
const{state:STATE,city:CITY,stateSlug:STATE_SLUG,citySlug:CITY_SLUG,fuelType:FUEL_TYPE,fuelLabel:FUEL_LABEL,capitalCity:CAPITAL_CITY}=CFG;

/* Cache */
const cache={};
const fetchJSON=url=>cache[url]||(cache[url]=fetch(url).then(r=>r.json()));

/* Utilities */
const goToURL=sel=>{const url=sel.options[sel.selectedIndex].dataset.url;if(url&&url!=="#")location.href=url};
const formatMonthYear=d=>{const dt=new Date(d);const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return`${monthNames[dt.getMonth()]} ${dt.getFullYear()}`};
const formatMonthShort=d=>{const dt=new Date(d);const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return monthNames[dt.getMonth()]};
const getPriceIndicator=change=>({arrow:change>0?"▲":change<0?"▼":"■",color:change>0?"red":change<0?"green":"black"});
const formatChangeWithSign=change=>{
  if(change>0)return`+${change.toFixed(2)}`;
  if(change<0)return change.toFixed(2);
  return change.toFixed(2)
};
const updateEl=(id,content,removeLoader=true)=>{
  const el=document.getElementById(id);
  if(el){
    if(typeof content==="string")el.innerHTML=content;else el.textContent=content;
    if(removeLoader)el.classList.remove("fuel-placeholder");
  }
};

/* Parse price and change from string like "₹951.50( 0.00 )" */
const parsePriceData=str=>{
  const match=str.match(/₹([\d,]+\.?\d*)\(\s*([-+]?\d+\.?\d*)\s*\)/);
  if(match){
    return{price:`₹${match[1]}`,change:parseFloat(match[2])}
  }
  return{price:str,change:0}
};

/* Browser Back Fix */
window.addEventListener("pageshow",e=>{
  if(e.persisted||window.performance?.navigation.type===2){
    const stateEl=document.getElementById("stateSelect");
    const cityEl=document.getElementById("citySelect");
    if(stateEl)stateEl.value=STATE;
    if(cityEl)cityEl.value=CITY;
    
    // Fix fuel type radio button
    const fuelRadio=document.querySelector(`input[type=radio][name="fuelType"][value="${FUEL_LABEL}"]`);
    if(fuelRadio)fuelRadio.checked=true;
  }
},{passive:true});

/* Schema Injection */
const injectSchema=()=>{
  requestIdleCallback(()=>{
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>{
      if(!el.id||el.id!=="frisqoo-custom-schema")el.remove();
    });
    
    const pageUrl=location.href;
    const org={"@type":"Organization",name:"Frisqoo",url:"https://www.frisqoo.com/"};
    
    const schema={
      "@context":"https://schema.org",
      "@graph":[
        {
          "@type":"WebPage",
          "@id":`${pageUrl}#webpage`,
          name:`${FUEL_LABEL} Price in ${CITY} - Today (${currentDate})`,
          url:pageUrl,
          description:`Get the latest ${FUEL_LABEL} cylinder prices in ${CITY} for ${currentDate}. This page provides current prices for domestic and commercial cylinders, monthly price history, and answers to frequently asked questions.`,
          mainEntity:{"@id":`${pageUrl}#dataset`}
        },
        {
          "@type":"Dataset",
          "@id":`${pageUrl}#dataset`,
          mainEntityOfPage:{"@id":`${pageUrl}#webpage`},
          name:`Monthly ${FUEL_LABEL} Cylinder Price History for ${CITY}`,
          description:`Monthly price data for ${FUEL_LABEL} cylinders in ${CITY}, ${STATE}.`,
          keywords:[`${FUEL_LABEL} price in ${CITY}`,`${FUEL_LABEL} cylinder rate ${CITY}`,`${CITY} ${FUEL_LABEL} price`,"LPG cylinder price","domestic LPG price"],
          license:"https://creativecommons.org/licenses/by/4.0/",
          spatialCoverage:{"@type":"Place",name:`${CITY}, ${STATE}`},
          creator:org,
          provider:org
        },
        {
          "@type":"FAQPage",
          mainEntity:Array.from(document.querySelectorAll(".showH > details")).map(faq=>({
            "@type":"Question",
            name:faq.querySelector("summary").textContent,
            acceptedAnswer:{"@type":"Answer",text:faq.querySelector(".aC p").innerHTML}
          }))
        }
      ]
    };
    
    const script=document.createElement("script");
    script.type="application/ld+json";
    script.id="frisqoo-custom-schema";
    script.text=JSON.stringify(schema);
    document.head.appendChild(script);
  },{timeout:2000});
};

/* FAQ Comparison */
const updateComparisonFAQ=stateData=>{
  if(!stateData||stateData.length<2||!CAPITAL_CITY){
    const el=document.getElementById("faqComparisonDetails");
    if(el)el.style.display="none";
    return;
  }
  
  let currentPrice="N/A",capitalPrice="N/A";
  let cheapest={price:Infinity,cities:[]},expensive={price:-Infinity,cities:[]};
  
  for(let i=1;i<stateData.length;i++){
    const[city,price]=stateData[i];
    const priceNum=parseFloat(String(price).replace(/[^0-9.-]/g,""));
    
    if(city===CITY)currentPrice=price;
    if(city===CAPITAL_CITY)capitalPrice=price;
    
    if(!isNaN(priceNum)){
      if(priceNum<cheapest.price)cheapest={price:priceNum,cities:[city]};
      else if(priceNum===cheapest.price)cheapest.cities.push(city);
      
      if(priceNum>expensive.price)expensive={price:priceNum,cities:[city]};
      else if(priceNum===expensive.price)expensive.cities.push(city);
    }
  }
  
  const formatCityList=cities=>{
    if(cities.length===1)return cities[0];
    if(cities.length===2)return cities.join(" and ");
    if(cities.length===3)return cities.slice(0,2).join(", ")+", and "+cities[2];
    return`${cities.length} cities including ${cities.slice(0,2).join(", ")}, and ${cities[2]}`
  };
  
  const capitalComp=CITY===CAPITAL_CITY
    ?`As the state capital, this price serves as a key benchmark for other cities in ${STATE}.`
    :`For comparison, the price in the state capital <strong>${CAPITAL_CITY}</strong> is <strong>${capitalPrice}</strong>.`;
  
  updateEl("faqComparisonAnswer",
    `In <strong>${CITY}</strong>, the current domestic LPG (14.2 kg) price is <strong>${currentPrice}</strong>. ${capitalComp}<br><br>Currently, the cheapest domestic LPG in ${STATE} is <strong>₹${cheapest.price.toFixed(2)}</strong> in <strong>${formatCityList(cheapest.cities)}</strong>, while the most expensive is <strong>₹${expensive.price.toFixed(2)}</strong> in <strong>${formatCityList(expensive.cities)}</strong>.<br><br>For a full city-by-city breakdown, <strong><a href="https://www.frisqoo.com/p/${FUEL_TYPE}-price-in-${STATE_SLUG}.html">view the complete ${STATE} ${FUEL_LABEL} price list</a></strong>.`,
    false
  );
};

/* Main Init */
const init=async()=>{
  try{
    /* Fetch all data in parallel */
    const[statesData,citiesData,currentData,historicalData,stateData]=await Promise.all([
      fetchJSON(`https://cdn.frisqoo.com/utilities/${FUEL_TYPE}/states.json`),
      fetchJSON(`https://cdn.frisqoo.com/utilities/${FUEL_TYPE}/${STATE_SLUG}.json`),
      fetchJSON(`https://cdn.frisqoo.com/${FUEL_TYPE}/${STATE_SLUG}/${CITY_SLUG}.json`),
      fetchJSON(`https://cdn.frisqoo.com/${FUEL_TYPE}/${STATE_SLUG}/past/${CITY_SLUG}.json`),
      fetchJSON(`https://cdn.frisqoo.com/${FUEL_TYPE}/${STATE_SLUG}.json`)
    ]);
    
    /* Populate Dropdowns */
    const stateSelect=document.getElementById("stateSelect");
    const citySelect=document.getElementById("citySelect");
    
    if(stateSelect){
      stateSelect.innerHTML=statesData.map(s=>
        `<option value="${s.name}" data-url="${s.url}"${s.name===STATE?" selected":""}>${s.name}</option>`
      ).join("");
      stateSelect.addEventListener("change",function(){goToURL(this)},{passive:true});
    }
    
    if(citySelect){
      citySelect.innerHTML=citiesData.map(c=>
        `<option value="${c.name}" data-url="${c.url}"${c.name===CITY?" selected":""}>${c.name}</option>`
      ).join("");
      citySelect.addEventListener("change",function(){goToURL(this)},{passive:true});
    }
    
    /* Update Current Price Display */
    if(currentData?.length>1){
      const domesticPrice=currentData[1][1]; // Domestic 14.2 Kg price
      const domesticChange=currentData[1][2]; // Price change
      const changeNum=parseFloat(String(domesticChange).replace(/[^0-9.-]/g,""));
      const{arrow,color}=getPriceIndicator(changeNum);
      
      updateEl("lpgPriceValue",
        `<span style="font-size:19px;font-weight:bold">${domesticPrice}</span> <span style="font-size:14px">/14.2Kg</span> <span style="font-size:14px">(₹${formatChangeWithSign(changeNum)} <span style="font-weight:bold;color:${color}">${arrow}</span>)</span>`,
        false
      );
    }
    
    /* Populate Current Price Table */
    const currentTableBody=document.querySelector("#currentPriceTable tbody");
    if(currentData?.length>1){
      const frag=document.createDocumentFragment();
      const template=document.createElement("template");
      
      template.innerHTML=currentData.slice(1).map(row=>{
        const[type,price,change]=row;
        const changeNum=parseFloat(String(change).replace(/[^0-9.-]/g,""));
        const{arrow,color}=getPriceIndicator(changeNum);
        return`<tr><td>${type}</td><td style="text-align:right">${price}</td><td style="text-align:right">${formatChangeWithSign(changeNum)} <span style="font-weight:bold;color:${color}">${arrow}</span></td></tr>`;
      }).join("");
      
      frag.appendChild(template.content);
      currentTableBody.innerHTML="";
      currentTableBody.appendChild(frag);
      
      /* Update FAQ - Current Price */
      updateEl("lpgPriceFAQ",`The domestic LPG (14.2 kg) cylinder price in <strong>${CITY}</strong> is <strong>${currentData[1][1]}</strong>. The commercial LPG (19 kg) cylinder is <strong>${currentData[2][1]}</strong>. LPG prices are revised on the 1st of every month.`,false);
      
      /* Update FAQ - Trend */
      const domesticChange=parseFloat(currentData[1][2].replace(/[^0-9.-]/g,""));
      const trendText=domesticChange>0
        ?`<strong style="color:red;">increased</strong> by ₹${Math.abs(domesticChange).toFixed(2)}`
        :domesticChange<0
        ?`<strong style="color:green;">decreased</strong> by ₹${Math.abs(domesticChange).toFixed(2)}`
        :`<strong style="color:black;">remained unchanged</strong>`;
      
      updateEl("faqTrendAnswer",`This month, the domestic LPG (14.2 kg) price in <strong>${CITY}</strong> has ${trendText} compared to last month.`,false);
    }else{
      currentTableBody.innerHTML='<tr><td colspan="3" style="text-align:center!important;padding:20px;">Current price data is unavailable.</td></tr>';
    }
    
    /* Populate Historical Price Table */
    const historicalTableBody=document.querySelector("#historicalPriceTable tbody");
    if(historicalData?.length>1){
      const frag=document.createDocumentFragment();
      const template=document.createElement("template");
      
      template.innerHTML=historicalData.slice(1,11).map(row=>{
        const[date,domesticStr,commercialStr]=row;
        const domestic=parsePriceData(domesticStr);
        const commercial=parsePriceData(commercialStr);
        const{arrow:dArrow,color:dColor}=getPriceIndicator(domestic.change);
        const{arrow:cArrow,color:cColor}=getPriceIndicator(commercial.change);
        
        return`<tr><td>${formatMonthYear(date)}</td><td style="text-align:right">${domestic.price} <span style="font-size:13px">(₹${formatChangeWithSign(domestic.change)} <span style="font-weight:bold;color:${dColor}">${dArrow}</span>)</span></td><td style="text-align:right">${commercial.price} <span style="font-size:13px">(₹${formatChangeWithSign(commercial.change)} <span style="font-weight:bold;color:${cColor}">${cArrow}</span>)</span></td></tr>`;
      }).join("");
      
      frag.appendChild(template.content);
      historicalTableBody.innerHTML="";
      historicalTableBody.appendChild(frag);
      
      /* Update FAQ - Last Month */
      if(historicalData.length>2){
        const lastMonth=parsePriceData(historicalData[2][1]);
        updateEl("faqLastMonthAnswer",`Last month (${formatMonthYear(historicalData[2][0])}), the domestic LPG (14.2 kg) price in <strong>${CITY}</strong> was <strong>${lastMonth.price}</strong> per cylinder.`,false);
      }
    }else{
      historicalTableBody.innerHTML='<tr><td colspan="3" style="text-align:center!important;padding:20px;">Historical data is unavailable.</td></tr>';
    }
    
    /* Render Chart */
    if(historicalData?.length>1){
      const renderChart=()=>{
        if(typeof Chart==="undefined"){
          setTimeout(renderChart,100);
          return;
        }
        
        let chartData={domestic:[],commercial:[],dates:[]};
        let selectedType="domestic";
        let selectedMonths=6;
        let chart=null;
        
        // Prepare chart data
        historicalData.slice(1).reverse().forEach(row=>{
          const[date,domesticStr,commercialStr]=row;
          const domestic=parsePriceData(domesticStr);
          const commercial=parsePriceData(commercialStr);
          
          chartData.dates.push(date);
          chartData.domestic.push(parseFloat(domestic.price.replace(/[^0-9.]/g,"")));
          chartData.commercial.push(parseFloat(commercial.price.replace(/[^0-9.]/g,"")));
        });
        
        const drawChart=(type,months)=>{
          let filtered={dates:[],prices:[]};
          
          if(months==="all"){
            filtered.dates=chartData.dates;
            filtered.prices=chartData[type];
          }else{
            filtered.dates=chartData.dates.slice(-months);
            filtered.prices=chartData[type].slice(-months);
          }
          
          if(chart)chart.destroy();
          
          const isDark=document.body.classList.contains("drK");
          const label=type==="domestic"?"Domestic (14.2 Kg)":"Commercial (19 Kg)";
          
          chart=new Chart(document.getElementById("priceChart"),{
            type:"line",
            data:{
              labels:filtered.dates.map(d=>formatMonthShort(d)),
              datasets:[{
                label:`${label} Price (₹/cylinder)`,
                data:filtered.prices,
                borderColor:type==="domestic"?"#28a745":"#dc3545",
                backgroundColor:type==="domestic"?"rgba(40,167,69,0.1)":"rgba(220,53,69,0.1)",
                borderWidth:2,
                pointRadius:4,
                pointBackgroundColor:type==="domestic"?"#28a745":"#dc3545",
                pointBorderColor:"#fff",
                pointBorderWidth:2,
                tension:0.3,
                fill:true
              }]
            },
            options:{
              responsive:true,
              maintainAspectRatio:false,
              plugins:{
                legend:{
                  display:true,
                  position:"top",
                  labels:{font:{size:12},color:isDark?"#e0e0e0":"#333"}
                },
                tooltip:{
                  backgroundColor:"rgba(0,0,0,0.8)",
                  titleColor:"#fff",
                  bodyColor:"#fff",
                  borderColor:type==="domestic"?"#28a745":"#dc3545",
                  borderWidth:1,
                  padding:10,
                  displayColors:false,
                  callbacks:{
                    title:ctx=>formatMonthYear(filtered.dates[ctx[0].dataIndex]),
                    label:ctx=>`Price: ₹${ctx.parsed.y.toFixed(2)}/cylinder`
                  }
                }
              },
              scales:{
                x:{
                  grid:{display:false},
                  ticks:{
                    font:{size:11},
                    color:isDark?"#b0b0b0":"#666",
                    maxRotation:45,
                    minRotation:0
                  }
                },
                y:{
                  beginAtZero:false,
                  grid:{color:isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.05)"},
                  ticks:{
                    font:{size:11},
                    color:isDark?"#b0b0b0":"#666",
                    callback:val=>`₹${val.toFixed(0)}`
                  }
                }
              }
            }
          });
        };
        
        drawChart(selectedType,selectedMonths);
        
        /* Chart Type buttons */
        document.querySelectorAll(".chart-type-btn").forEach(btn=>{
          btn.addEventListener("click",function(){
            document.querySelectorAll(".chart-type-btn").forEach(b=>b.classList.remove("active"));
            this.classList.add("active");
            
            selectedType=this.dataset.type;
            drawChart(selectedType,selectedMonths);
          });
        });
        
        /* Timeframe buttons */
        document.querySelectorAll(".timeframe-btn").forEach(btn=>{
          btn.addEventListener("click",function(){
            document.querySelectorAll(".timeframe-btn").forEach(b=>b.classList.remove("active"));
            this.classList.add("active");
            
            const months=this.dataset.months;
            selectedMonths=months==="all"?"all":parseInt(months);
            drawChart(selectedType,selectedMonths);
          });
        });
      };
      
      renderChart();
    }
    
    /* Generate FAQ & Schema */
    updateComparisonFAQ(stateData);
    injectSchema();
    
  }catch(err){
    console.error("Init error:",err);
  }
  
  /* Low Priority Tasks */
  requestIdleCallback(()=>{
    /* Update page title */
    const titleEl=document.querySelector(".pTtl > span");
    if(titleEl){
      const titleText=titleEl.innerText.split(" - Today")[0];
      titleEl.innerHTML=`${titleText} - Today <span style="font-size:18px">(${currentDate})</span>`;
    }
    
    /* Load related posts */
    fetchJSON("https://www.frisqoo.com/feeds/posts/summary/-/Fuel?alt=json&max-results=5")
      .then(data=>{
        const posts=(data.feed?.entry||[]).map((entry,i)=>
          `<p style="display:flex;align-items:center;margin:0"><span>${i+1}. </span><a href="${entry.link.find(l=>l.rel==="alternate").href}" target="_blank" style="margin-left:5px">${entry.title.$t}</a></p>`
        ).join("");
        
        const container=document.getElementById("related-posts");
        if(container)container.innerHTML=posts;
      })
      .catch(()=>{});
  },{timeout:3000});
};

/* Execute */
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init,{once:true,passive:true});
}else{
  init();
}

/* Radio Button Navigation */
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll('input[type=radio][name="fuelType"]').forEach(radio=>{
    radio.addEventListener("change",()=>{
      const link=radio.nextElementSibling?.querySelector("a");
      if(link)link.click();
    },{passive:true});
  });
},{once:true,passive:true});

})();
