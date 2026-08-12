from io import BytesIO

from openpyxl import Workbook

from server.importer import parse_import


def _workbook_bytes(headers: list[str], row: list[str]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(headers)
    sheet.append(row)
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def test_special_political_case_header_imports_as_pending_political_case():
    headers = [
        "序号",
        "案件名称",
        "姓名",
        "性别",
        "特殊身份",
        "涉案地点（非西城区标注具体哪个外区、外省）",
        "是否西城户籍",
        "移送时间",
        "案由",
        "简要案情(一句话）",
    ]
    content = _workbook_bytes(
        headers,
        [
            "1",
            "张某某涉政治安全线索案",
            "张某某",
            "男",
            "重点关注人员",
            "北京市西城区金融街街道某地",
            "是",
            "2026-08-12",
            "网络政治安全线索核查",
            "发现涉政治安全风险线索，需进入专项研判。",
        ],
    )

    parsed = parse_import("特殊案件表头.xlsx", content)

    assert parsed.errors == []
    assert len(parsed.rows) == 1
    row = parsed.rows[0]
    assert row["case_number"].startswith("PS-")
    assert row["department"] == "政治安全专项"
    assert row["category"] == "政治安全特殊案件"
    assert row["legal_cause"] == "网络政治安全线索核查"
    assert row["street_status"] == "已确认街道"
    assert row["street_name"] == "金融街街道"
    assert row["political_review_status"] == "待人工复核"
    assert row["political_risk_level"] == "关注"
    assert row["political_subject"] == "重点关注人员"
    assert row["summary"] == "发现涉政治安全风险线索，需进入专项研判。"

    assert len(parsed.subjects) == 1
    assert parsed.subjects[0]["name"] == "张某某"
    assert parsed.subjects[0]["gender"] == "男"
    assert parsed.subjects[0]["is_resident"] is True
