# How to give My Closet more free AI try-ons (Hugging Face)

Without this, try-on still works but uses the anonymous free quota (a few tries per day per internet connection).
A free account token gives a bigger daily quota. Cost: R0. No card needed.

## A. Free account + read token (5 minutes)
1. On your phone or PC, go to https://huggingface.co/join
2. Enter your email and a password, tap **Next**, pick a username (e.g. `dennisbotha`), tick the terms, tap **Create account**.
3. Open the confirmation email from Hugging Face and tap the link.
4. Go to https://huggingface.co/settings/tokens
5. Tap **+ Create new token**.
6. At the top choose token type **Read**.
7. Name it `my-closet`, tap **Create token**.
8. Tap **Copy**. It starts with `hf_…`. (You only see it once; if lost, make a new one.)
9. Open My Closet on her phone → **Me** tab → scroll to **AI try-on settings**.
10. Paste the token into **Hugging Face read token**. Leave **Space ID** empty (it uses `yisol/IDM-VTON`). Tap **Save**.

The token is stored only in that phone's browser (localStorage). "Delete all my data" removes it. A Read token can't change anything in your account. You can revoke it any time on the tokens page.

## B. Optional: your own copy of the IDM-VTON Space
Only worth doing if the public Space is always busy or down.
1. Signed in, open https://huggingface.co/spaces/yisol/IDM-VTON
2. Tap the **⋮** menu (top right) → **Duplicate this Space**.
3. Owner: your username. Visibility: **Private**. Hardware: leave the default.
4. ⚠️ If the only hardware that works is **ZeroGPU** or a paid GPU and it asks for PRO or a card: **stop and cancel**. On free CPU hardware the model is far too slow to use. Stay with part A (spend nothing).
5. If it's created and shows **Running**, the Space ID is `yourname/IDM-VTON` (shown in the page address).
6. In My Closet → Me → AI try-on settings, enter **Space ID** `yourname/IDM-VTON` plus the token from part A. Tap **Save**.

## What to paste in Settings
| Field | Value |
|---|---|
| Space ID | empty (default `yisol/IDM-VTON`), or `yourname/IDM-VTON` from part B |
| Hugging Face read token | `hf_…` from part A step 8 |

If try-on says "quota used up", wait a few hours (the quota refills during the day) or add the token.
