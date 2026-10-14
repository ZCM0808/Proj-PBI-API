--overseas
105 server folder access(reach Bella for real time granting access):
--1.0  MANUAL_CUSTOMER_MASTER_TBL_20260518.csv
\\VIWL2W000105\to_AWS\from_user\TIMBERLAND
--2.0  PA001_MANUAL_CUSTOMER_MASTER_TBL_20260518.csv
\\VIWL2W000105\to_azure\from_user\TIMBERLAND

--folder access configuration
"\\VIWL2W000105\Configuration\Email_List_Configuration.csv"

JIRA from Tony: https://vf-corp.atlassian.net/browse/AUAP-9262



--sync schedule from customer to JOS:
everyday at 03:50；11:15；15:00
every 45 days for all Sales & latest Inventory





-------------------------------------VANS PH（Philippines）&TH Madeline
--Store codes check
--store_code\dealer_code\brand\status\dealer_region\store_opening_date\country all can NOT be null
--VANS | Philippines
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,local_store_name,local_address,file_name,forecast_opening_date,created_timestamp,last_modified_date,*
from silver_storedb.store_master_storedb
where 1=1
--and dealer_code in ('1001133')
and store_code in ('211005','211006','211007','211008','211009','211010','211011','211012','211013','211014','211015','211016','211017','211018','211019','211020','211021','211022','211023','211024','211025','211026','211027','211028','211029','211030','211031','211032','211033','211034','211035','211036','211037','211038','211039','211040','211041','211042'
);
--VANS | Thailand
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,local_store_name,local_address,file_name,forecast_opening_date,created_timestamp,last_modified_date,*
from silver_storedb.store_master_storedb
where store_code  in ('210079','210080','210081','210082','210083','210084','210085','210086','210087','210088','210089','210090','210091','210092','210093','210094','210095','210096','210097','210098','210099','210100','210101','210102','210103','210104','210105','210106','210107','210108','210109','210110','210111','210112','210113','210114','210115','210116','210117','210118','210119','210120','210121','210122','210123','210124','210125','210126','210127'
);


--PA upload History
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where 1=1
and dcp.customer_number = '1001158'  --VANS Thailand
group by all
order by dcp.processed_date desc;

--DTP Sales
select a.generic_article_number_apac,a.upc,a.material_apac,* from gold_commercial.fact_partner_sales a where customer_number in  ('1019072');





--ICEBREAKER | China
--1019072
--store_code\dealer_code\brand\status\dealer_region\store_opening_date\country all can NOT be null
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,local_store_name,*
from silver_storedb.store_master_storedb
where store_code  in ('100417'
)


----------------------------------北京壹美-天津万象城
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,forecast_opening_date,created_timestamp,last_modified_date,local_store_name,local_address,file_name,*
from silver_storedb.store_master_storedb
where store_code  in ('100417')

--storedb history in bronze layer-INSUFFICIENT_PERMISSIONS
--select store_code ,province ,last_modified_date ,processed_date ,file_name
--from bronze_storedb.store_master_storedb
--where store_code  = '100417'




--DTP check(sales & inventory)
--sales
--upc=通用产品代码（Universal Product Code）;ItemCode = SKU，ItemBarCode = UPC
select * from gold_commercial.fact_partner_sales a where customer_number in  ('1017966','1017962');
select customer_number,year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1019072')
and year(a.transaction_creation_date) = 2026
and month(a.transaction_creation_date) in (6,7,8,9)
group by all
order by all;

--inventory
--select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1017966','1017962');
select customer_number, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1019072')
and snapshot_date = '2026-08-31'
group by all
order by all;



----------------------------------西安重点-西安SKP
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,forecast_opening_date,created_timestamp,last_modified_date,local_store_name,local_address,file_name,*
from silver_storedb.store_master_storedb
where store_code  in ('100419');

--storedb history in bronze layer-INSUFFICIENT_PERMISSIONS
--select store_code ,province ,last_modified_date ,processed_date ,file_name
--from bronze_storedb.store_master_storedb
--where store_code  = '100417'


--PA upload History
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number = '1018946'
group by all
order by dcp.processed_date desc;


--sales
--UPC=通用产品代码（Universal Product Code） = ItemBarCode;ItemCode = SKU
select * from gold_commercial.fact_partner_sales a where customer_number in  ('1017966','1017962');
select customer_number,location_number,year(a.transaction_creation_date), month(a.transaction_creation_date)
,sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1018946')
and year(a.transaction_creation_date) = 2026
and month(a.transaction_creation_date) in (8,9)
group by all
order by all;

--inventory
--select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1017966','1017962');
select customer_number, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1018946')
--and snapshot_date = '2026-08-31'
group by all
order by all;






------------------------------1017962 IB 成都威肯-昆明顺城 | 1017966 IB 海南竹恋-广州天汇
--1018945 SW 海南竹恋-广州白鹅潭/佛山万象天地
--StoreDB
--store_code\dealer_code\brand\status\dealer_region\store_opening_date\country all can NOT be null
--VANS | Philippines
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,store_grading,forecast_opening_date,created_timestamp,last_modified_date,local_store_name,local_address,file_name,*
from silver_storedb.store_master_storedb
where 1=1
and dealer_code in ('1018945','1017966')
--and store_code  in ('100140')
--where local_store_name in ('昆明顺城','广州天汇')
;

--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1018945';
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number = '1018945'
group by all
order by dcp.processed_date desc;


--DTP check(sales & inventory)
--sales
--upc=通用产品代码（Universal Product Code）;ItemCode = SKU，ItemBarCode = UPC
select * from gold_commercial.fact_partner_sales a where customer_number in  ('1018945');
select customer_number, location_number, year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value), count(*)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1018945')
and year(a.transaction_creation_date) = 2026
--and month(a.transaction_creation_date) = 9
group by all
order by all;

--inventory
select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1018945');
select customer_number, location_number, snapshot_date, sum(b.total_stock_quantity), count(*)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1018945')
--and snapshot_date = '2026-08-31'
group by all
order by all;

select customer_number, location_number, sum(net_sales_value), sum(current_order_line_quantity), sum(total_stock_quantity)
, count(*), transaction_date,DAYOFWEEK(transaction_date), DATE_FORMAT(transaction_date,'EEEE')
--select *
from platinum_foundation.fact_partner_sales_inventory_summary
where 1=1
and customer_number in  ('1018945')
--and location_number in ('100397')
group by all
order by customer_number, location_number, transaction_date
;


---------------------TIMBERLAND 滔博新开店 063245	无锡惠山洛南大道杉杉奥特莱斯广场TBL | Alice Yu <Alice_Yu@vfc.com> StoreDB | Tao Ying <tao_ying@vfc.com>
--StoreDB
--store_code\dealer_code\brand\status\dealer_region\store_opening_date\country all can NOT be null
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,*
from silver_storedb.store_master_storedb
where store_code in ('063245')

--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1009355';
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number = '1009355'
group by all
order by dcp.processed_date desc;


--DTP check(sales & inventory)
--sales
select a.generic_article_number_apac,a.upc,a.material_apac,* from gold_commercial.fact_partner_sales a where customer_number in  ('1017966','1017962');
select customer_number,year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1009355')
--and year(a.transaction_creation_date) = 2026
--and month(a.transaction_creation_date) = 8
group by all
order by all desc;

--inventory
--select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1017966','1017962');
select customer_number, location_number, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1009355')
--and snapshot_date = '2026-08-31'
group by all
order by all desc;





----------------------------------IB/SW 青岛睿翼-武汉梦时代 - '100390','100396'
--StoreDB
--store_code\dealer_code\brand\status\dealer_region\store_opening_date\country all can NOT be null
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,forecast_opening_date,last_modified_date,city_code,local_store_name,local_address,file_name,created_timestamp,*
from silver_storedb.store_master_storedb
where store_code  in ('100396','100141')

--storedb history in bronze layer-INSUFFICIENT_PERMISSIONS
--select store_code ,province ,last_modified_date ,processed_date ,file_name
--from bronze_storedb.store_master_storedb
--where store_code  = '100417'

--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1017962';
select dcp.customer_number,dcp.customer_partner_brand, dcp.customer_partner_status, dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where 1=1
and dcp.customer_number in ('1017962','1019306')
group by all
order by dcp.processed_date desc;


--DTP check(sales & inventory)
--sales
select a.generic_article_number_apac,a.upc,a.material_apac,* from gold_commercial.fact_partner_sales a where customer_number in  ('1017966','1017962');
select customer_number,year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1019306')
--and year(a.transaction_creation_date) = 2026
--and month(a.transaction_creation_date) = 8
group by all
order by all desc;


--inventory
select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1017970');
select customer_number,b.location_number, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where 1=1
--and customer_number in  ('1017970')
--and snapshot_date = '2026-08-31'  --1073
and customer_number in  ('1019306')
and snapshot_date = '2026-09-17'  --1123
group by all
order by all desc;




---------------------------------- icebreaker北京联和新开店-北京国贸
--Dealer Code	客户名称	VF Store Code	Brand	开业时间
--1017030	北京联合	100391	北京国贸	9/2/2026

select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,forecast_opening_date,created_timestamp,last_modified_date,local_store_name,local_address,file_name,*
from silver_storedb.store_master_storedb
where store_code  in ('100391')

--storedb history in bronze layer-INSUFFICIENT_PERMISSIONS
--select store_code ,province ,last_modified_date ,processed_date ,file_name
--from bronze_storedb.store_master_storedb
--where store_code  = '100417'

--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1009355';
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number in ('1017030')
group by all
order by dcp.processed_date desc;


--sales
select a.generic_article_number_apac,a.upc,a.material_apac,* from gold_commercial.fact_partner_sales a where customer_number in  ('1017966','1017962');
select customer_number,year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1017030')
and year(a.transaction_creation_date) = 2026
and month(a.transaction_creation_date) = 8
group by all
order by all desc;



--inventory
select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1017970');
select customer_number,b.location_number, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1017030')
and snapshot_date = '2026-08-31'
group by all
order by all desc;





----------------------------------TBL 百丽鞋业-无锡惠山
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,forecast_opening_date,created_timestamp,last_modified_date,local_store_name,local_address,file_name,*
from silver_storedb.store_master_storedb
where store_code  in ('063245','063246');

--storedb history in bronze layer-INSUFFICIENT_PERMISSIONS
--select store_code ,province ,last_modified_date ,processed_date ,file_name
--from bronze_storedb.store_master_storedb
--where store_code  = '100417'

--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1009355';
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number in ('1009355','1016530')
group by all
order by dcp.processed_date desc;





----------------------------------TBL CN 陕西五环

--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1009355';
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number in ('1004580')
group by all
order by dcp.processed_date desc;



--sales
select a.generic_article_number_apac,a.upc,a.material_apac,* from gold_commercial.fact_partner_sales a where customer_number in  ('1004580');
select customer_number,year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1004580')
and year(a.transaction_creation_date) = 2026
and month(a.transaction_creation_date) = 9
and a.brand = 'TIMBERLAND'
group by all
order by all desc;



--inventory
select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1004580');
select customer_number--,b.location_number
, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1004580')
and snapshot_date = '2026-09-15'
group by all
order by all desc;





-------------------------------------------------TBL NZA Data Ingestion | 1004762 | June Lee

--Store codes check
--store_code\dealer_code\brand\status\dealer_region\store_opening_date\country all can NOT be null
--VANS | Philippines
select brand, store_code,dealer_code,country,status,dealer_region,store_opening_date
,row_number()over(partition by store_code, brand order by created_timestamp desc) as num
,local_store_name,local_address,file_name,forecast_opening_date,created_timestamp,last_modified_date,*
from silver_storedb.store_master_storedb
where 1=1 
--and store_code in ()
and dealer_code in ('1004762')
;

220000
230000
TIMBERLAND
TIMBERLAND
--PA upload History
select * from gold_customer.dim_customer_partner dcp where dcp.customer_number = '1009355';
select dcp.customer_number,dcp.customer_partner_brand,dcp.local_customer_partner_name,dcp.processed_date ,dcp.file_name ,count(1)
from gold_customer.dim_customer_partner dcp
where dcp.customer_number in ('1004762')
group by all
order by dcp.processed_date desc;



--sales
select a.generic_article_number_apac,a.upc,a.material_apac,* from gold_commercial.fact_partner_sales a where customer_number in  ('1004762');
select customer_number,year(a.transaction_creation_date), month(a.transaction_creation_date), sum(a.net_sales_value)
from gold_commercial.fact_partner_sales a
where customer_number in  ('1004762')
and year(a.transaction_creation_date) = 2026
and month(a.transaction_creation_date) = 9
and a.brand = 'TIMBERLAND'
group by all
order by all desc;



--inventory
select * from gold_commercial.fact_partner_inventory  where customer_number in  ('1004762');
select customer_number--,b.location_number
, snapshot_date, sum(b.total_stock_quantity)  --,sum(b.t_retail_price_amt)
from gold_commercial.fact_partner_inventory b
where customer_number in  ('1004762')
and snapshot_date = '2026-09-15'
group by all
order by all desc;