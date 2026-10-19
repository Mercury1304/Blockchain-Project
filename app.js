const ROLE_NAMES = ["No role", "Manufacturer", "Distributor", "Retailer"];
const $ = (id) => document.getElementById(id);

let provider, signer, contract, readContract, currentId = null;

// ---------- helpers ----------
function short(a) { return a.slice(0, 6) + "..." + a.slice(-4); }

function setTx(msg, kind) {
  const box = $("txStatus");
  box.className = "tx " + (kind || "");
  box.textContent = msg;
}

function revertReason(e) {
  if (e.code === "ACTION_REJECTED") return "You rejected the request in MetaMask.";
  const m = e.reason || e.shortMessage || e.message || "Unknown error";
  const found = /revert(?:ed)?(?: with reason string)? ['"]?([^'"\n(]+)/i.exec(e.message || "");
  return (e.reason || (found && found[1].trim()) || m).toString();
}

function needWallet() {
  if (!contract) { setTx("Connect MetaMask first.", "bad"); return false; }
  return true;
}

// ---------- wallet ----------
async function connect() {
  if (!window.ethereum) { setTx("MetaMask not found. Install the extension and reload.", "bad"); return; }
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    setTx("Set CONTRACT_ADDRESS in config.js after deploying.", "bad"); return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if (EXPECTED_CHAIN_ID && Number(net.chainId) !== EXPECTED_CHAIN_ID) {
      setTx(`Wrong network (chain ${net.chainId}). Switch MetaMask to chain ${EXPECTED_CHAIN_ID}.`, "bad"); return;
    }
    signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    readContract = contract;
    const addr = await signer.getAddress();
    $("account").textContent = addr;
    $("connectBtn").textContent = "Connected";
    await showRole(addr);
    await loadActivity();
    setTx("Wallet connected.", "ok");
  } catch (e) { setTx(revertReason(e), "bad"); }
}

async function showRole(addr) {
  const [role, admin] = await Promise.all([contract.roles(addr), contract.owner()]);
  const label = admin.toLowerCase() === addr.toLowerCase() ? "Admin" : ROLE_NAMES[Number(role)];
  const b = $("roleBadge");
  b.textContent = label; b.hidden = false;
}

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}

// ---------- transactions ----------
async function send(label, fn) {
  if (!needWallet()) return;
  try {
    setTx(label + ": confirm in MetaMask...", "pending");
    const tx = await fn();
    setTx(label + ": waiting for block... " + tx.hash, "pending");
    const rc = await tx.wait();
    setTx(`${label} succeeded in block ${rc.blockNumber}. Tx: ${tx.hash}`, "ok");
    await loadActivity();
    if (currentId !== null) verify(currentId);
  } catch (e) { setTx(`${label} failed: ${revertReason(e)}`, "bad"); }
}

$("roleForm").addEventListener("submit", (e) => {
  e.preventDefault();
  send("Assign role", () => contract.assignRole($("roleAddr").value.trim(), Number($("roleSel").value)));
});
$("regForm").addEventListener("submit", (e) => {
  e.preventDefault();
  send("Register product", () => contract.registerProduct($("regId").value, $("regName").value, $("regBatch").value));
});
$("trfForm").addEventListener("submit", (e) => {
  e.preventDefault();
  send("Transfer product", () => contract.transferProduct($("trfId").value, $("trfTo").value.trim(), $("trfLoc").value));
});
$("soldForm").addEventListener("submit", (e) => {
  e.preventDefault();
  send("Mark as sold", () => contract.markSold($("soldId").value));
});
$("flagBtn").addEventListener("click", () => send("Report product", () => contract.reportSuspicious(currentId)));

// ---------- reading blockchain data ----------
async function verify(id) {
  if (!needWallet()) return;
  const out = $("verifyResult"), stamp = $("stamp");
  try {
    const p = await readContract.verifyProduct(id);
    currentId = String(id);
    stamp.hidden = false;
    if (!p.exists) {
      stamp.className = "stamp bad";
      stamp.innerHTML = "Not registered<small>Possible counterfeit</small>";
      out.textContent = "No product with ID " + id + " exists on the blockchain.";
      $("timelineWrap").hidden = true;
      return;
    }
    const sold = Number(p.status) === 1;
    const flags = Number(p.flags);
    stamp.className = "stamp " + (flags > 0 ? "warn" : "ok");
    stamp.innerHTML = flags > 0
      ? `Registered<small>${flags} report(s) filed</small>`
      : `Verified<small>${sold ? "Sold to consumer" : "In supply chain"}</small>`;
    out.innerHTML = `<dl>
      <dt>Product</dt><dd></dd><dt>Batch</dt><dd></dd>
      <dt>Made by</dt><dd></dd><dt>Held by</dt><dd></dd></dl>`;
    const dds = out.querySelectorAll("dd");
    dds[0].textContent = p.name; dds[1].textContent = p.batch || "-";
    dds[2].textContent = p.manufacturer; dds[3].textContent = p.currentOwner;
    await showHistory(id);
  } catch (e) { out.textContent = "Could not read: " + revertReason(e); }
}

async function showHistory(id) {
  const h = await readContract.getHistory(id);
  const ol = $("timeline");
  ol.innerHTML = "";
  h.forEach((c) => {
    const li = document.createElement("li");
    const w = document.createElement("div"); w.className = "where"; w.textContent = c.location;
    const m = document.createElement("div"); m.className = "meta";
    m.textContent = `${new Date(Number(c.time) * 1000).toLocaleString()} by ${c.handler}`;
    li.append(w, m); ol.appendChild(li);
  });
  $("timelineWrap").hidden = false;
}

$("verifyBtn").addEventListener("click", () => {
  const id = $("verifyId").value;
  if (!id) { $("verifyResult").textContent = "Enter a product ID."; return; }
  verify(id);
});

async function loadActivity() {
  const list = $("activity");
  try {
    const [reg, trf, sold] = await Promise.all([
      contract.queryFilter("ProductRegistered", 0),
      contract.queryFilter("ProductTransferred", 0),
      contract.queryFilter("ProductSold", 0)
    ]);
    const rows = [...reg, ...trf, ...sold].sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 15);
    $("count").textContent = "(" + (await contract.productCount()) + " products registered)";
    list.innerHTML = "";
    if (!rows.length) { list.innerHTML = '<li class="muted">No activity yet.</li>'; return; }
    rows.forEach((ev) => {
      const li = document.createElement("li");
      const a = ev.args;
      let text = "";
      if (ev.eventName === "ProductRegistered") text = `Product #${a.id} "${a.name}" registered by ${short(a.manufacturer)}`;
      if (ev.eventName === "ProductTransferred") text = `Product #${a.id} moved ${short(a.from)} to ${short(a.to)} at ${a.location}`;
      if (ev.eventName === "ProductSold") text = `Product #${a.id} sold by ${short(a.retailer)}`;
      li.textContent = `Block ${ev.blockNumber}: ${text}`;
      list.appendChild(li);
    });
  } catch (e) { list.innerHTML = '<li class="muted">Could not load events.</li>'; }
}

$("connectBtn").addEventListener("click", connect);
