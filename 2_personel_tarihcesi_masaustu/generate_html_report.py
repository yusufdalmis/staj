import sqlite3
import pandas as pd
import webbrowser
import os
import json
import color_settings

def get_default_color(name):
    if not name: return "#e2e8f0"
    hash_val = sum(ord(c) for c in str(name))
    hue = hash_val % 360
    return f"hsl({hue}, 65%, 85%)"

def get_color_for_birim(birim_name, custom_colors):
    if not birim_name or pd.isna(birim_name) or str(birim_name).strip() == "":
        return "transparent"
    birim_str = str(birim_name).strip()
    if birim_str in custom_colors:
        return custom_colors[birim_str]
    return get_default_color(birim_str)

def generate_report(db_path, output_html):
    conn = sqlite3.connect(db_path)
    saved_colors = color_settings.load_colors()

    # 1. Ana veriyi çek
    df_personel = pd.read_sql_query('''
        SELECT G.id, G.yil, G.ay, G.dosya_adi, P.isim || ' ' || P.soyisim AS ad_soyad, G.unvan, G.birim 
        FROM Gorev G
        JOIN Personel P ON G.personel_id = P.id
        WHERE G.is_komisyon = 0 OR G.is_komisyon IS NULL
    ''', conn)

    df_komisyon = pd.read_sql_query('''
        SELECT G.id, G.yil, G.ay, G.dosya_adi, P.isim || ' ' || P.soyisim AS ad_soyad, G.unvan, G.birim 
        FROM Gorev G
        JOIN Personel P ON G.personel_id = P.id
        WHERE G.is_komisyon = 1
    ''', conn)

    # 2. Pivot Tablo (Personel Tarihçesi)
    pivot_table = pd.DataFrame()
    if not df_personel.empty:
        df_personel['donem'] = df_personel['yil'].astype(str) + "_" + df_personel['ay'].astype(str).str.zfill(2)
        pivot_table = df_personel.pivot_table(
            index='ad_soyad', 
            columns='donem', 
            values='birim', 
            aggfunc='first'
        ).fillna("").reset_index()
        pivot_table.rename(columns={'ad_soyad': 'Personel Adı'}, inplace=True)

    # 3. Birimler Özet Tablosu
    df_birimler = pd.DataFrame()
    if not df_personel.empty:
        df_birimler = df_personel.pivot_table(
            index='birim', 
            columns='donem', 
            values='ad_soyad', 
            aggfunc=lambda x: ", ".join(x)
        ).fillna("").reset_index()
        df_birimler.rename(columns={'birim': 'Birim Adı'}, inplace=True)

    # 4. Başkanlar Tarihçesi
    df_baskan_tarihce = pd.DataFrame()
    if not df_personel.empty:
        df_baskanlar = df_personel[df_personel['unvan'].str.contains('Başkan|Koordinatör|Genel Sekreter', case=False, na=False)]
        if not df_baskanlar.empty:
            df_baskan_tarihce = df_baskanlar.pivot_table(
                index='birim', 
                columns='donem', 
                values='ad_soyad', 
                aggfunc=lambda x: ", ".join(x)
            ).fillna("").reset_index()
            df_baskan_tarihce.rename(columns={'birim': 'Birim Adı'}, inplace=True)

    # 5. Birim Başına Personel Sayısı & Unvan Dağılımı
    df_birim_kisi = pd.DataFrame()
    df_unvan_dagilimi = pd.DataFrame()
    if not df_personel.empty:
        df_birim_kisi = df_personel.groupby('birim')['ad_soyad'].nunique().reset_index()
        df_birim_kisi.columns = ['Birim Adı', 'Personel Sayısı']
        df_birim_kisi = df_birim_kisi.sort_values('Personel Sayısı', ascending=False)

        df_unvan_dagilimi = df_personel.groupby('unvan')['ad_soyad'].nunique().reset_index()
        df_unvan_dagilimi.columns = ['Unvan Adı', 'Personel Sayısı']
        df_unvan_dagilimi = df_unvan_dagilimi.sort_values('Personel Sayısı', ascending=False)

    # Kariyer Yolu Tablosu
    df_kariyer = pd.DataFrame()
    if not df_personel.empty:
        df_sorted = df_personel.sort_values(['ad_soyad', 'yil', 'ay'])
        records = []
        for p_name, group in df_sorted.groupby('ad_soyad'):
            birimler = []
            for b in group['birim']:
                if not birimler or birimler[-1] != b:
                    birimler.append(b)
            row = {'Personel Adı': p_name}
            for i, b in enumerate(birimler):
                row[f'Birim {i+1}'] = b
            records.append(row)
        df_kariyer = pd.DataFrame(records).fillna("")

    # Komisyonlar
    df_guncel_komisyon = pd.DataFrame()
    if not df_komisyon.empty:
        df_komisyon['donem'] = df_komisyon['yil'].astype(str) + "_" + df_komisyon['ay'].astype(str).str.zfill(2)
        en_son_donem = df_komisyon['donem'].max()
        df_guncel_komisyon = df_komisyon[df_komisyon['donem'] == en_son_donem].drop(columns=['id', 'donem', 'yil', 'ay'])
        df_guncel_komisyon = df_guncel_komisyon[['ad_soyad', 'unvan', 'birim', 'dosya_adi']]

    conn.close()

    # --- HTML CSS Yarat ---
    def colorize_cell(val):
        c = get_color_for_birim(val, saved_colors)
        if c != "transparent":
            return f"background-color: {c}; color: #333;"
        return ""
        
    def get_style(df, color_cols=None):
        if df.empty: return ""
        try:
            styler = df.style
            try: styler = styler.hide(axis="index")
            except AttributeError: styler = styler.hide_index()
                
            if color_cols is None: styler = styler.map(colorize_cell)
            else:
                valid_cols = [c for c in color_cols if c in df.columns]
                styler = styler.map(colorize_cell, subset=valid_cols)
            return styler.set_table_attributes('class="table table-bordered table-hover"').to_html()
        except AttributeError:
            styler = df.style
            try: styler = styler.hide(axis="index")
            except AttributeError: styler = styler.hide_index()
                
            if color_cols is None: styler = styler.applymap(colorize_cell)
            else:
                valid_cols = [c for c in color_cols if c in df.columns]
                styler = styler.applymap(colorize_cell, subset=valid_cols)
            return styler.set_table_attributes('class="table table-bordered table-hover"').to_html()

    def get_style_baskan(df):
        if df.empty: return ""
        def colorize_isim(val):
            if not isinstance(val, str) or val == "": return ""
            c = get_default_color(val)
            return f"background-color: {c}; color: #333;"
            
        month_cols = [c for c in df.columns if c != 'Birim Adı']
        try:
            styler = df.style
            try: styler = styler.hide(axis="index")
            except AttributeError: styler = styler.hide_index()
            styler = styler.map(colorize_cell, subset=['Birim Adı']) if 'Birim Adı' in df.columns else styler
            if month_cols: styler = styler.map(colorize_isim, subset=month_cols)
            return styler.set_table_attributes('class="table table-bordered table-hover"').to_html()
        except AttributeError:
            styler = df.style
            try: styler = styler.hide(axis="index")
            except AttributeError: styler = styler.hide_index()
            styler = styler.applymap(colorize_cell, subset=['Birim Adı']) if 'Birim Adı' in df.columns else styler
            if month_cols: styler = styler.applymap(colorize_isim, subset=month_cols)
            return styler.set_table_attributes('class="table table-bordered table-hover"').to_html()

    html_content = f"""
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <title>Gelişmiş Analizler ve Raporlar</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" rel="stylesheet">
        <link href="https://cdn.datatables.net/fixedcolumns/4.3.0/css/fixedColumns.bootstrap5.min.css" rel="stylesheet">
        <style>
            body {{ background-color: #f8f9fa; padding: 20px; font-size: 13px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
            .nav-tabs {{ margin-bottom: 20px; }}
            .table-container {{ background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }}
            th {{ background-color: #343a40 !important; color: white !important; vertical-align: middle; text-align: center; }}
            td {{ vertical-align: middle; }}
            
            .control-panel {{
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.08);
                margin-bottom: 20px;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 15px;
                justify-content: space-between;
            }}
            .single-view-card {{
                display: none;
                background: white;
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }}

            /* Yazdırma (Print) Özellikleri - Dikey (Portrait) Çıktı Düzeni */
            @media print {{
                @page {{
                    size: portrait;
                    margin: 12mm 12mm 12mm 12mm;
                }}
                body {{
                    background-color: white !important;
                    padding: 0 !important;
                    font-size: 10pt !important;
                    color: black !important;
                }}
                .no-print, .nav-tabs, .dataTables_length, .dataTables_filter, .dataTables_info, .dataTables_paginate {{
                    display: none !important;
                }}
                .table-container {{
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin-bottom: 15mm !important;
                    border: none !important;
                }}
                .single-view-card {{
                    box-shadow: none !important;
                    padding: 0 !important;
                }}
                #allReportsView {{
                    display: block !important;
                }}
                .tab-pane, .single-view-card {{
                    display: none !important;
                }}
                .print-active-target {{
                    display: block !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                }}
                .table {{
                    width: 100% !important;
                    font-size: 10pt !important;
                    border-collapse: collapse !important;
                }}
                th, td {{
                    padding: 6px 8px !important;
                    border: 1px solid #333 !important;
                }}
                .dataTables_scrollBody {{
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="control-panel no-print">
            <div>
                <h3 class="m-0 fw-bold text-dark">📊 Gelişmiş Analizler ve Raporlar</h3>
                <small class="text-muted">Bir satır seçtiğinizde ekranda anında X-Y transpoze dikey görünüm açılır.</small>
            </div>
            <div class="d-flex align-items-center gap-3 flex-wrap">
                <div class="d-flex align-items-center">
                    <label for="rowSelect" class="form-label me-2 mb-0 fw-bold text-nowrap">📌 Satır Seç:</label>
                    <select id="rowSelect" class="form-select form-select-sm" style="min-width: 280px;">
                        <option value="">-- Tüm Satırlar (Tüm Tablo) --</option>
                    </select>
                </div>
                <button onclick="printActiveTab()" class="btn btn-primary btn-sm px-3 fw-bold">
                    🖨️ Aktif Sekmeyi Yazdır (Dikey)
                </button>
            </div>
        </div>

        <!-- Seçili Satır Transpoze Dikey Analiz Görünümü (X-Y Düzlemi Swap) -->
        <div id="transposedRowView" class="single-view-card">
            <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <div>
                    <h3 class="fw-bold text-primary mb-1" id="transposedRowTitle">Satır Analiz Raporu</h3>
                    <div class="text-muted small" id="transposedRowSubtitle">X-Y Düzlemi Transpoze Edilmiş Dikey Döküm (Satır ve Sütunlar Yer Değiştirilmiş)</div>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary fs-6" id="transposedTotalCols">0 Parametre</span>
                </div>
            </div>

            <h5 class="fw-bold mb-3">📜 Transpoze Edilmiş Dikey Tablo (Satır ve Sütun Değişimi)</h5>
            <div class="table-responsive">
                <table class="table table-bordered table-striped align-middle" id="transposedTable">
                    <thead class="table-dark">
                        <tr>
                            <th style="width: 60px;">#</th>
                            <th style="width: 260px;" id="thColHeader">Parametre / Dönem (Sütun)</th>
                            <th id="thValHeader">Değer / Birim / Unvan (Satır Verisi)</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- Tüm Raporlar Sekmeli Görünüm -->
        <div id="allReportsView">
            <ul class="nav nav-tabs no-print" id="myTab" role="tablist">
                <li class="nav-item" role="presentation"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-tarihce">Personel Tarihçesi</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-kariyer">Kariyer Yolu</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-birim">Birimler Özet</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-baskan">Başkanlar Tarihçesi</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-sayi">Birim Başına Personel</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-unvan">Unvan Dağılımı</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-komisyon">Güncel Komisyonlar</button></li>
            </ul>

            <div class="tab-content" id="myTabContent">
                <div class="tab-pane fade show active table-container" id="tab-tarihce">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Personel Tarihçesi</h5>
                    {get_style(pivot_table, color_cols=[c for c in pivot_table.columns if c != 'Personel Adı'])}
                </div>
                <div class="tab-pane fade table-container" id="tab-kariyer">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Kariyer Yolu</h5>
                    {get_style(df_kariyer, color_cols=[c for c in df_kariyer.columns if c.startswith('Birim')])}
                </div>
                <div class="tab-pane fade table-container" id="tab-birim">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Birimler Özet</h5>
                    {get_style(df_birimler, color_cols=['Birim Adı'])}
                </div>
                <div class="tab-pane fade table-container" id="tab-baskan">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Başkanlar Tarihçesi</h5>
                    {get_style_baskan(df_baskan_tarihce)}
                </div>
                <div class="tab-pane fade table-container" id="tab-sayi">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Birim Başına Personel</h5>
                    {get_style(df_birim_kisi, color_cols=['birim'])}
                </div>
                <div class="tab-pane fade table-container" id="tab-unvan">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Unvan Dağılımı</h5>
                    {get_style(df_unvan_dagilimi, color_cols=[]) if not df_unvan_dagilimi.empty else ""}
                </div>
                <div class="tab-pane fade table-container" id="tab-komisyon">
                    <h5 class="d-none d-print-block fw-bold border-bottom pb-2">Güncel Komisyonlar</h5>
                    {get_style(df_guncel_komisyon, color_cols=['birim'])}
                </div>
            </div>
        </div>

        <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
        <script src="https://cdn.datatables.net/fixedcolumns/4.3.0/js/dataTables.fixedColumns.min.js"></script>
        <script>
            function printActiveTab() {{
                $('.print-active-target').removeClass('print-active-target');

                if ($('#transposedRowView').is(':visible')) {{
                    $('#transposedRowView').addClass('print-active-target');
                }} else {{
                    var $activePane = $('.tab-pane.active');
                    if ($activePane.length > 0) {{
                        $activePane.addClass('print-active-target');
                    }} else {{
                        $('#allReportsView').addClass('print-active-target');
                    }}
                }}
                window.print();
            }}

            $(document).ready(function() {{
                var tables = $('table:not(#transposedTable)').DataTable({{
                    "language": {{
                        "url": "//cdn.datatables.net/plug-ins/1.13.6/i18n/tr.json"
                    }},
                    "pageLength": 100,
                    "scrollX": true,
                    "scrollY": "60vh",
                    "scrollCollapse": true,
                    "fixedColumns": {{
                        "leftColumns": 1
                    }},
                    "initComplete": function(settings, json) {{
                        $(window).trigger('resize');
                    }}
                }});

                function updateRowSelectForActiveTab() {{
                    var $activeTab = $('.tab-pane.active');
                    var optionsHtml = '<option value="">-- Tüm Satırlar (Tüm Tablo) --</option>';
                    var uniqueRows = [];

                    // 1. Search DOM table rows directly
                    $activeTab.find('tbody tr').each(function() {{
                        var firstCell = $(this).find('td:first, th:first');
                        if (firstCell.length > 0) {{
                            var txt = firstCell.text().trim();
                            if (txt && txt.indexOf('No matching') === -1 && uniqueRows.indexOf(txt) === -1) {{
                                uniqueRows.push(txt);
                            }}
                        }}
                    }});

                    // 2. Fallback: Search DataTables API rows in active tab
                    if (uniqueRows.length === 0 && $.fn.DataTable) {{
                        $activeTab.find('table').each(function() {{
                            if ($.fn.DataTable.isDataTable(this)) {{
                                var dt = $(this).DataTable();
                                var allData = dt.rows().data().toArray();
                                $.each(allData, function(i, row) {{
                                    if (row && row.length > 0) {{
                                        var cleanVal = $('<div>').html(row[0]).text().trim();
                                        if (cleanVal && uniqueRows.indexOf(cleanVal) === -1) {{
                                            uniqueRows.push(cleanVal);
                                        }}
                                    }}
                                }});
                            }}
                        }});
                    }}

                    uniqueRows.sort();
                    $.each(uniqueRows, function(i, rowName) {{
                        optionsHtml += '<option value="' + encodeURIComponent(rowName) + '">' + rowName + '</option>';
                    }});

                    $('#rowSelect').html(optionsHtml).val('');
                    $('#transposedRowView').hide();
                    $('#allReportsView').show();
                }}

                // Sekme değişiminde rowSelect menüsünü güncelle
                $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {{
                    updateRowSelectForActiveTab();
                }});

                // Sayfa yüklendiğinde ve DataTables hazır olduğunda doldur
                setTimeout(updateRowSelectForActiveTab, 300);

                // #rowSelect Değişiminde X-Y Transpoze Tablosu Oluştur ve Ekranda Aç
                $('#rowSelect').on('change', function() {{
                    var rawVal = $(this).val();
                    var selectedRowName = rawVal ? decodeURIComponent(rawVal) : "";
                    
                    if (!selectedRowName) {{
                        $('#transposedRowView').hide();
                        $('#allReportsView').fadeIn();
                        $.fn.dataTable.tables({{ visible: true, api: true }}).columns.adjust();
                        return;
                    }}

                    var $activeTab = $('.tab-pane.active');
                    var colHeaders = [];
                    var rowValues = [];

                    // 1. Collect column headers from active table
                    $activeTab.find('thead th').each(function() {{
                        var txt = $(this).text().trim();
                        if (txt) colHeaders.push(txt);
                    }});

                    // 2. Search DOM row cells
                    $activeTab.find('tbody tr').each(function() {{
                        var $tr = $(this);
                        var firstCellText = $tr.find('td:first, th:first').text().trim();
                        if (firstCellText === selectedRowName) {{
                            $tr.find('td, th').each(function() {{
                                var cellTxt = $(this).text().trim();
                                var cellStyle = $(this).attr('style') || '';
                                rowValues.push({{ text: cellTxt, style: cellStyle }});
                            }});
                            return false;
                        }}
                    }});

                    // 3. Fallback to DataTables API if DOM table had scroll split
                    if (rowValues.length === 0 && $.fn.DataTable) {{
                        $activeTab.find('table').each(function() {{
                            if ($.fn.DataTable.isDataTable(this)) {{
                                var dt = $(this).DataTable();
                                colHeaders = [];
                                dt.columns().every(function() {{
                                    colHeaders.push($(this.header()).text().trim());
                                }});
                                dt.rows().every(function() {{
                                    var d = this.data();
                                    if (d && d.length > 0) {{
                                        var cleanVal = $('<div>').html(d[0]).text().trim();
                                        if (cleanVal === selectedRowName) {{
                                            for (var i = 0; i < d.length; i++) {{
                                                var rawCell = d[i] || '';
                                                var cleanCell = $('<div>').html(rawCell).text().trim();
                                                var cellBg = '';
                                                if (typeof rawCell === 'string' && rawCell.indexOf('background-color') !== -1) {{
                                                    var m = rawCell.match(/background-color:\s*([^;"]+)/);
                                                    if (m) cellBg = 'background-color:' + m[1] + '; color:#111; font-weight:600;';
                                                }}
                                                rowValues.push({{ text: cleanCell, style: cellBg }});
                                            }}
                                            return false;
                                        }}
                                    }}
                                }});
                            }}
                        }});
                    }}

                    if (rowValues.length > 0) {{
                        var rowTitleHeader = colHeaders[0] || "Satır";
                        $('#transposedRowTitle').text('📌 ' + selectedRowName);
                        $('#transposedRowSubtitle').text('Sekme: ' + $('.nav-link.active').text().trim() + ' | ' + rowTitleHeader + ': ' + selectedRowName);
                        
                        $('#thColHeader').text(rowTitleHeader + ' / Sütun / Dönem');
                        $('#thValHeader').text('Değer / Görev / Birim');

                        var tbodyHtml = '';
                        var validCount = 0;

                        for (var i = 1; i < colHeaders.length && i < rowValues.length; i++) {{
                            var colName = colHeaders[i];
                            var valObj = rowValues[i];
                            var styleAttr = valObj.style ? 'style="' + valObj.style + '"' : '';
                            validCount++;

                            tbodyHtml += '<tr>' +
                                '<td class="text-center fw-bold">' + validCount + '</td>' +
                                '<td class="fw-bold text-dark"><span class="badge bg-secondary">' + colName + '</span></td>' +
                                '<td ' + styleAttr + '>' + (valObj.text || '<span class="text-muted italic">-</span>') + '</td>' +
                                '</tr>';
                        }}

                        $('#transposedTotalCols').text(validCount + ' Parametre / Sütun');
                        $('#transposedTable tbody').html(tbodyHtml);

                        $('#allReportsView').hide();
                        $('#transposedRowView').fadeIn();
                    }}
                }});
            }});
        </script>
    </body>
    </html>
    """

    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    webbrowser.open(f"file://{os.path.abspath(output_html)}")
