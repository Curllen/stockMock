# 通过baostock获取股票数据并保存为csv文件
# 通过baostock获取股票数据并保存为csv文件
import baostock as bs
import pandas as pd
from datetime import datetime, time, timedelta


def get(code, start_date, end_date):
    #### 登陆系统 ####
    lg = bs.login()
    if lg.error_code != '0':
        return None, f"Login failed: {lg.error_msg}"

    #### 获取历史K线数据 ####
    rs = bs.query_history_k_data_plus(code,
                                      "date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg,peTTM,pbMRQ,psTTM,pcfNcfTTM,isST",
                                      start_date=start_date, end_date=end_date,
                                      frequency="d", adjustflag="3")
    
    if rs.error_code != '0':
        bs.logout()
        return None, f"Query failed: {rs.error_msg}"

    #### 打印结果集 ####
    data_list = []
    while (rs.error_code == '0') & rs.next():
        data_list.append(rs.get_row_data())
    
    result = pd.DataFrame(data_list, columns=rs.fields)
    
    # ensure numeric columns are actually numeric
    numeric_cols = ['open', 'high', 'low', 'close', 'volume', 'amount']
    for col in numeric_cols:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors='coerce')
    
    # Validate date range
    if not result.empty and 'date' in result.columns:
        actual_start = result['date'].min()
        actual_end = result['date'].max()
        
        # Note: baostock may not have data for weekends/holidays
        # So we just log the actual range returned
        print(f"Requested: {start_date} to {end_date}")
        print(f"Returned: {actual_start} to {actual_end} ({len(result)} records)")

    #### 登出系统 ####
    bs.logout()
    
    return result, None


def _default_end_date_str(now: datetime | None = None) -> str:
    """
    如果没有输入时间：
    - 当前时间 > 17:30：结束日期取今天
    - 否则：结束日期取昨天
    """
    now = now or datetime.now()
    cutoff = time(17, 30)
    if now.time() > cutoff:
        d = now.date()
    else:
        d = (now - timedelta(days=1)).date()
    return d.strftime("%Y-%m-%d")


if __name__ == "__main__":
    print("=== Baostock 历史K线数据下载 ===")
    print("提示：日期格式为 YYYY-MM-DD，例如 2024-01-01")
    print("提示：若结束日期不输入，将自动根据当前时间决定：>17:30 取今天，否则取昨天")
    print()

    code = input("请输入股票代码（例如：sh.600000 / sz.000001）：").strip()
    if not code:
        print("股票代码不能为空，程序结束。")
    else:
        start_date = input("请输入开始日期 start_date（YYYY-MM-DD，可回车跳过，默认=结束日期）：").strip()
        end_date = input("请输入结束日期 end_date（YYYY-MM-DD，可回车自动计算）：").strip()

        if not end_date:
            end_date = _default_end_date_str()
            print(f"未输入结束日期，已自动设置 end_date = {end_date}")

        if not start_date:
            start_date = end_date
            print(f"未输入开始日期，已自动设置 start_date = {start_date}")

        print()
        print(f"即将查询：code={code}, start_date={start_date}, end_date={end_date}")
        get(code, start_date, end_date)