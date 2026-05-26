"""
SEO Agent — 入口脚本
用法：
    python main.py                          # 交互式输入
    python main.py --keyword "custom medals" --type "corporate" --material "zinc alloy"
"""
import sys
import argparse

# 修复 Windows GBK 终端编码问题
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from crew import run_seo_pipeline


def interactive_mode():
    """交互式模式 — 引导用户输入"""
    print("\n" + "=" * 50)
    print("  B2B SEO Content Agent (CrewAI)")
    print("  Master-SubAgent Architecture")
    print("=" * 50 + "\n")

    seo_keyword = input("SEO 目标关键词: ").strip()
    customer_type = input("客户类型 (如 corporate, sports club): ").strip()
    material = input("产品材质 (如 zinc alloy, iron, acrylic): ").strip()

    print("\n提示: 请将产品图片放在项目目录下，然后在下方输入文件路径")
    print("（如无图片，直接回车跳过）\n")

    images_input = input("图片路径 (多个用逗号分隔): ").strip()
    image_paths = [p.strip() for p in images_input.split(",") if p.strip()] if images_input else []

    print(f"\n启动 Agent 流水线...")
    print(f"  关键词: {seo_keyword}")
    print(f"  客户类型: {customer_type}")
    print(f"  材质: {material}")
    print(f"  图片: {len(image_paths)} 张\n")

    result = run_seo_pipeline(
        product_image_paths=image_paths or None,
        seo_keyword=seo_keyword,
        customer_type=customer_type,
        material=material,
    )

    _print_summary(result)


def _print_summary(result: dict):
    """打印运行摘要"""
    print("\n" + "=" * 50)
    print("  运行完成")
    print("=" * 50)
    print(f"  修改轮数: {result['rounds']}")
    if result["scorecard"]:
        s = result["scorecard"]
        print(f"  最终评分: {s.get('total_score', '?')}/70")
        print(f"  通过: {'YES' if s.get('pass') else 'NO'}")
    if result.get("image_seo_data"):
        imgs = result["image_seo_data"]
        print(f"  图片SEO: {len(imgs)} 个视图已生成 alt/文件名/webp")
    print(f"  输出文件: {result['output_path']}")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="B2B SEO Content Agent")
    parser.add_argument("--keyword", type=str, help="SEO target keyword")
    parser.add_argument("--type", type=str, default="", help="Customer type")
    parser.add_argument("--material", type=str, default="", help="Product material")
    args = parser.parse_args()

    if args.keyword:
        # 命令行模式
        result = run_seo_pipeline(
            seo_keyword=args.keyword,
            customer_type=getattr(args, "type", ""),
            material=args.material,
        )
        _print_summary(result)
    else:
        interactive_mode()
