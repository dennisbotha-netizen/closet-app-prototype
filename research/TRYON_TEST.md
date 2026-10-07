# Virtual try-on quick test (2026-10-07, ~15:11 SAST)
- Inputs: model_stock.jpg + garment.jpg = the IDM-VTON Space's own bundled demo images (VITON-HD stock). No real user photo was uploaded.
- yisol/IDM-VTON (HF ZeroGPU, gradio_client, anonymous): OK in 25.8 s, 30 steps -> result_idmvton.png
- franciszzj/Leffa: failed in 4.6 s, "exceeded your ZeroGPU runs limit" (anonymous quota, used up by the IDM run)
- zhengchong/CatVTON: Space in RUNTIME_ERROR (down)
