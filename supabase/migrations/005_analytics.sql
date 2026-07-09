-- ============================================================
-- 005_analytics.sql — Phase 5 (task 5.1)
-- RPC สรุปยอดสำหรับแดชบอร์ด Store Admin (§5.2) และแพลตฟอร์ม (§5.3)
--
-- กติกา:
--  * นับเฉพาะออร์เดอร์ที่จ่ายแล้ว (confirmed/packing/shipped) — ไม่รวม
--    cancelled/pending_payment/slip_uploaded (DoD ข้อ 1)
--  * วันตัดยอด = เที่ยงคืนเวลาไทย (§7.6) — group ตาม created_at ที่
--    แปลงเป็น Asia/Bangkok ก่อน
--  * ทุกฟังก์ชันรับ p_tenant_id และถูกเรียกผ่าน service role เท่านั้น
--    (revoke จาก anon/authenticated/public — defense in depth เหมือน
--     consume_discount_code ใน 004) — RLS ไม่คุ้ม service role จึงต้อง
--    scope ด้วย p_tenant_id ในตัว query เอง
--  * lower bound ของ created_at เขียนแบบ sargable (>= ค่าคงที่) เพื่อให้
--    ใช้ index orders_tenant_status_created_idx (DoD ข้อ 2: 10k orders < 1s)
-- ============================================================

-- index รวม tenant+status+created สำหรับ aggregate ช่วงเวลา (แทน/เสริม
-- orders_tenant_status_idx + orders_tenant_created_idx เดิม)
create index if not exists orders_tenant_status_created_idx
  on orders (tenant_id, status, created_at);

-- ------------------------------------------------------------
-- Store-level (§5.2)
-- ------------------------------------------------------------

-- ยอดขายรายวัน p_days วันล่าสุด (เติมวันที่ไม่มีออร์เดอร์ด้วย 0 เพื่อกราฟต่อเนื่อง)
create or replace function public.store_daily_sales(p_tenant_id uuid, p_days int default 30)
returns table(day date, order_count int, revenue bigint)
language sql stable as $$
  with bounds as (
    select (timezone('Asia/Bangkok', now()))::date as today
  ),
  days as (
    select generate_series(
      ((b.today - (p_days - 1)))::timestamp, b.today::timestamp, interval '1 day'
    )::date as day
    from bounds b
  ),
  sales as (
    select (timezone('Asia/Bangkok', o.created_at))::date as day,
           count(*)::int as order_count,
           sum(o.total_amount)::bigint as revenue
    from orders o, bounds b
    where o.tenant_id = p_tenant_id
      and o.status in ('confirmed','packing','shipped')
      and o.created_at >= ((b.today - (p_days - 1))::timestamp at time zone 'Asia/Bangkok')
    group by 1
  )
  select d.day,
         coalesce(s.order_count, 0)::int as order_count,
         coalesce(s.revenue, 0)::bigint as revenue
  from days d
  left join sales s using (day)
  order by d.day;
$$;

-- ยอดขายรายสัปดาห์ p_weeks สัปดาห์ล่าสุด (สัปดาห์เริ่มวันจันทร์ ตาม date_trunc('week'))
create or replace function public.store_weekly_sales(p_tenant_id uuid, p_weeks int default 12)
returns table(week_start date, order_count int, revenue bigint)
language sql stable as $$
  with bounds as (
    select date_trunc('week', timezone('Asia/Bangkok', now()))::date as this_week
  ),
  weeks as (
    select generate_series(
      (b.this_week - ((p_weeks - 1) * 7))::timestamp, b.this_week::timestamp, interval '1 week'
    )::date as week_start
    from bounds b
  ),
  sales as (
    select date_trunc('week', timezone('Asia/Bangkok', o.created_at))::date as week_start,
           count(*)::int as order_count,
           sum(o.total_amount)::bigint as revenue
    from orders o, bounds b
    where o.tenant_id = p_tenant_id
      and o.status in ('confirmed','packing','shipped')
      and o.created_at >= ((b.this_week - ((p_weeks - 1) * 7))::timestamp at time zone 'Asia/Bangkok')
    group by 1
  )
  select w.week_start,
         coalesce(s.order_count, 0)::int as order_count,
         coalesce(s.revenue, 0)::bigint as revenue
  from weeks w
  left join sales s using (week_start)
  order by w.week_start;
$$;

-- Top สินค้าขายดีตามจำนวนชิ้น + ยอดเงิน (§2.3) — group ด้วย product_name
-- (snapshot ใน order_items ไม่เก็บ product_id; ดู DECISIONS.md)
create or replace function public.store_top_products(
  p_tenant_id uuid, p_days int default 30, p_limit int default 10
)
returns table(product_name text, qty bigint, revenue bigint)
language sql stable as $$
  select oi.product_name,
         sum(oi.qty)::bigint as qty,
         sum(oi.qty * oi.unit_price)::bigint as revenue
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.tenant_id = p_tenant_id
    and o.status in ('confirmed','packing','shipped')
    and o.created_at >= ((timezone('Asia/Bangkok', now())::date - (p_days - 1))::timestamp at time zone 'Asia/Bangkok')
  group by oi.product_name
  order by qty desc, revenue desc
  limit p_limit;
$$;

-- การ์ดตัวเลขสรุปช่วง p_days (ยอดขาย / จำนวนออร์เดอร์ / ยอดเฉลี่ยต่อออร์เดอร์)
create or replace function public.store_sales_summary(p_tenant_id uuid, p_days int default 30)
returns table(revenue bigint, order_count int, avg_order_value int)
language sql stable as $$
  select
    coalesce(sum(total_amount), 0)::bigint as revenue,
    count(*)::int as order_count,
    coalesce(round(avg(total_amount)), 0)::int as avg_order_value
  from orders
  where tenant_id = p_tenant_id
    and status in ('confirmed','packing','shipped')
    and created_at >= ((timezone('Asia/Bangkok', now())::date - (p_days - 1))::timestamp at time zone 'Asia/Bangkok');
$$;

-- จำนวนออร์เดอร์แยกตามสถานะ (ทั้งหมด) — ใช้แสดง "ออร์เดอร์ค้างต่อสถานะ"
create or replace function public.store_order_status_counts(p_tenant_id uuid)
returns table(status text, count int)
language sql stable as $$
  select status, count(*)::int
  from orders
  where tenant_id = p_tenant_id
  group by status;
$$;

-- ------------------------------------------------------------
-- Platform-level (§5.3) — super admin เท่านั้น (service role)
-- ------------------------------------------------------------

-- สรุปแพลตฟอร์ม: MRR/ARR (จากค่าแพลนของร้าน active), จำนวนร้านแต่ละสถานะ, churn 30 วัน
create or replace function public.platform_summary()
returns table(
  mrr bigint, arr bigint,
  active_stores int, trial_stores int, grace_stores int,
  locked_stores int, archived_stores int, total_stores int,
  churned_30d int
)
language sql stable as $$
  select
    coalesce(round(sum(p.price_yearly) filter (where t.status = 'active') / 12.0), 0)::bigint as mrr,
    coalesce(sum(p.price_yearly) filter (where t.status = 'active'), 0)::bigint as arr,
    count(*) filter (where t.status = 'active')::int as active_stores,
    count(*) filter (where t.status = 'trial')::int as trial_stores,
    count(*) filter (where t.status = 'grace')::int as grace_stores,
    count(*) filter (where t.status = 'locked')::int as locked_stores,
    count(*) filter (where t.status = 'archived')::int as archived_stores,
    count(*)::int as total_stores,
    count(*) filter (
      where t.status in ('locked','archived')
        and t.locked_at is not null
        and t.locked_at >= now() - interval '30 days'
    )::int as churned_30d
  from tenants t
  join plans p on p.id = t.plan_id;
$$;

-- ร้านใหม่ต่อเดือน p_months เดือนล่าสุด (เติมเดือนที่ไม่มีร้านใหม่ด้วย 0)
create or replace function public.platform_new_stores(p_months int default 12)
returns table(month date, count int)
language sql stable as $$
  with bounds as (
    select date_trunc('month', timezone('Asia/Bangkok', now())) as this_month
  ),
  months as (
    select generate_series(
      b.this_month - make_interval(months => p_months - 1), b.this_month, interval '1 month'
    )::date as month
    from bounds b
  ),
  created as (
    select date_trunc('month', timezone('Asia/Bangkok', t.created_at))::date as month,
           count(*)::int as count
    from tenants t, bounds b
    where t.created_at >= (b.this_month - make_interval(months => p_months - 1))
    group by 1
  )
  select m.month, coalesce(c.count, 0)::int as count
  from months m
  left join created c using (month)
  order by m.month;
$$;

-- ------------------------------------------------------------
-- Grants — เรียกได้เฉพาะ service role (route/RSC ฝั่ง server)
-- ------------------------------------------------------------
revoke execute on function public.store_daily_sales(uuid, int) from public, anon, authenticated;
revoke execute on function public.store_weekly_sales(uuid, int) from public, anon, authenticated;
revoke execute on function public.store_top_products(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.store_sales_summary(uuid, int) from public, anon, authenticated;
revoke execute on function public.store_order_status_counts(uuid) from public, anon, authenticated;
revoke execute on function public.platform_summary() from public, anon, authenticated;
revoke execute on function public.platform_new_stores(int) from public, anon, authenticated;

grant execute on function public.store_daily_sales(uuid, int) to service_role;
grant execute on function public.store_weekly_sales(uuid, int) to service_role;
grant execute on function public.store_top_products(uuid, int, int) to service_role;
grant execute on function public.store_sales_summary(uuid, int) to service_role;
grant execute on function public.store_order_status_counts(uuid) to service_role;
grant execute on function public.platform_summary() to service_role;
grant execute on function public.platform_new_stores(int) to service_role;
