import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import web3 from 'web3'
import Web3Modal from "web3modal"
import Fortmatic from "fortmatic";
import WalletConnectProvider from "@walletconnect/web3-provider";
import market from '../config/PICNFTMarket.json';
import nft from '../config/PICNFT.json';
//Note: just for test in rinkeby testnet.
const NETWORK_ID = 4;

const nftmarketaddress = market.networks[NETWORK_ID].address
const nftmarketabi = market.abi
//const nftaddress = nft.networks[NETWORK_ID].address
const nftabi = nft.abi

export default function Home() {
  const [formInput, updateFormInput] = useState({salekind: '', price: '', reserved: '', duration:'', bidPrice: ''})
  const [nfts, setNfts] = useState([])
  const [curAcount, setCurAcount] = useState('')
  const [tx, setTx] = useState([])
  const [loaded, setLoaded] = useState('not-loaded')
  const router = useRouter()

  useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      //console.log(router.asPath)
      if(router.asPath == '/'){
        loadNFTs()
      }
    })
    loadNFTs()
  }, [])

  async function withdrawNft(nft) {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const marketContract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
  
    const transaction = await marketContract.withdawNFTFromMarket(nft.itemId)
  
    setTx([nft.itemId.toString(),'withdawNFTFromMarket'])
    await transaction.wait()
  
    loadNFTs()
  }

  async function loadNFTs() {
    const providerOptions = {
      fortmatic: {
        package: Fortmatic,
        options: {
          // Your Mikko's TESTNET api key
          key: "pk_test_391E26A3B43A3350"
        }
      },
      walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          //Your infura id
          infuraId: "4306119bc7cb4aee9876021ba3da4bd7" // required
        }
      }
    };

    const web3Modal = new Web3Modal({
      network: "rinkeby", // just for testnet
      cacheProvider: true,
      disableInjectedProvider: false,
      providerOptions: providerOptions, // required
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    
    const marketContract = new ethers.Contract(nftmarketaddress, nftmarketabi, provider)

    const signer = provider.getSigner()
    const curAcounttmp = await signer.getAddress();
    setCurAcount(curAcounttmp);
    setTx([])

    // get all selling items
    const data = await marketContract.fetchAllNftsLockedInMarket()

    const items = await Promise.all(data.map(async i => {
      const tokenContract = new ethers.Contract(i.nftContract, nftabi, provider)

      let tokenUri = await tokenContract.tokenURI(i.tokenId)
      if(tokenUri.indexOf('ipfs://') == 0){
        tokenUri = tokenUri.replace('ipfs://','https://ipfs.io/ipfs/')
      }
      //console.log(tokenUri);
      const meta = await axios.get(tokenUri)
      //console.log('meta is as below =>');
      //console.log(meta)

      let salekind = i.salekind.toString();
      //console.log(salekind);
      let price = web3.utils.fromWei(i.price.toString(), 'ether');
      let reserved = web3.utils.fromWei(i.reserved.toString(), 'ether');
      let listtimen = i.listTime.toNumber();
      //console.log('---------->');
      //console.log(listtimen);
      //console.log(listtimen.toString());
      let listtime = new Date(listtimen*1000).toLocaleString()
      let duration = i.duration.toNumber();
      let endtimeDate = new Date(listtimen*1000+duration*60*1000)
      let endtime = endtimeDate.toLocaleString()
      let now = new Date()
      let binvalid = now > endtimeDate? true:false
      let bid = null;
      // when bid, get the max big price
      if(salekind == '1'){
        bid = await marketContract.bids(i.itemId.toString());
        //console.log(bid);
      }
      let image = meta.data.image;
      if(image.indexOf('ipfs://') == 0){
        image = image.replace('ipfs://','https://ipfs.io/ipfs/')
      }
      let item = {
        salekind,
        price,
        reserved,
        listtime,
        endtime,
        nftContract: i.nftContract,
        tokenId: i.tokenId,
        seller: i.seller,
        owner: i.owner,
        image,
        name: meta.data.name,
        description: meta.data.description,
        itemId: i.itemId,
        binvalid,
        bid
      }
      return item
    }))


    //console.log('items: ', items)
    setNfts(items)
    setLoaded('loaded')
  }

  async function buyNft(nft,sk) {
    const web3Modal = new Web3Modal({
      network: "rinkeby", // just for testnet
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    const curAcounttmp = await signer.getAddress();
    setCurAcount(curAcounttmp);
    
    if(sk == '1' && !formInput.bidPrice && !nft.binvalid){
      window.alert('Please input bid price.');
      return;
    }

    if(nft.binvalid && !nft.bid?.value){
      window.alert('Sale ended.');
      return;
    }

    //console.log(nft.bid?.value.toString())
    //console.log(formInput.bidPrice)
    if (sk == '1' && !nft.binvalid &&parseFloat(web3.utils.fromWei(nft.bid?.value.toString(), 'ether'))>= parseFloat(formInput.bidPrice) ) {
      window.alert('when auction bid price must bigger than bade price.');
      return;
    }

    const sellPrice = web3.utils.toWei(nft.price.toString(), 'ether')

    const contract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
  
    let transaction

    let redirect = false
    if(sk == '0'){
      redirect = true
      transaction = await contract.buyNftbyMarketItemId(nft.itemId, {
        value: sellPrice
      })
    }else{
      const bidPrice = nft.binvalid? '0' : web3.utils.toWei(formInput.bidPrice.toString(), 'ether')
      redirect = nft.binvalid
      if(!nft.binvalid && parseFloat(formInput.bidPrice) >= parseFloat(nft.reserved.toString())){
        redirect = true
      }
      if(!nft.binvalid && parseFloat(formInput.bidPrice) < parseFloat(nft.price.toString())){
        window.alert('Bid price must bigger then start price.');
        return;
      }
      transaction = await contract.buyNftbyMarketItemId(nft.itemId, {
        value: bidPrice
      })
    }

    setTx([nft.itemId.toString(),'buyNftbyMarketItemId'])
    await transaction.wait()

    loadNFTs()
    //redirect? router.push("/my-nfts"):loadNFTs()
  }

  async function resellNftInMarket(nft) {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()

    // sale
    const marketcontract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
    
    const price = web3.utils.toWei(formInput.price, 'ether')
    const reserved = formInput.salekind =='0'? web3.utils.toWei('0', 'ether'): web3.utils.toWei(formInput.reserved, 'ether')
    const duration = !formInput.duration ? '0': formInput.duration
    const itemId = nft.itemId
    const tokenId = nft.tokenId
    
    const transaction = await marketcontract.resellNFTInMarket(itemId,nft.nftContract, tokenId, formInput.salekind,price,reserved,duration)

    setTx([nft.itemId.toString(),'resellNFTInMarket'])
    await transaction.wait()
    loadNFTs()
  }

  async function resellNft(nft) {
    const { salekind ,price, reserved, duration } = formInput
    if (!price || !salekind || !duration) {
      window.alert('Please install Sale information.');
      return;
    }
    if (salekind == '0' && reserved) {
      window.alert('no need for reserved value for Fix sale kind.');
      return;
    }
    if (salekind == '1' && reserved && parseFloat(reserved)< parseFloat(price) ) {
      window.alert('when auction reserved price must not less than start price.');
      return;
    }
    try {
      resellNftInMarket(nft)
    } catch (error) {
      //console.log('Error uploading file: ', error);
      window.alert(error)
    }
  }

  if (loaded === 'loaded' && !nfts.length) return (<h1 className="p-20 text-4xl">No NFTs!</h1>)
  return (
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-2 gap-4 pt-8 ">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border p-4 shadow">
                <img src={nft.image} className="rounded" />
                {
                  nft.salekind == '0' ?
                    (
                      !nft.binvalid ?
                      <p className="text-1xl my-1 font-bold text-green-400">定額販売</p> :
                      <p className="text-1xl my-1 font-bold text-red-400">定額販売(期間終了)</p>
                    ) :
                    (
                      !nft.binvalid ?
                      <p className="text-1xl my-1 font-bold text-green-400">オークション販売</p> :
                      <p className="text-1xl my-1 font-bold text-red-400">オークション販売(期間終了)</p>
                    )
                }
                <p className="text-1xl my-1 font-bold">NFT Contract: {nft.nftContract.substr(0,6)+ '...'}</p>
                <p className="text-1xl my-1 font-bold">NFT Token Id: {nft.tokenId.toString().length > 6 ? nft.tokenId.toString().substr(0,6)+ '...' : nft.tokenId.toString()}</p>
                <p className="text-1xl my-1 font-bold">Name: {nft.name}</p>
                <p className="text-1xl my-1 font-bold">Description: {nft.description}</p>
                <p className="text-1xl my-1 font-bold">Sale start time: {nft.listtime}</p>
                <p className="text-1xl my-1 font-bold">Sale end time: {nft.endtime}</p>
                <p className="text-1xl my-1 font-bold text-blue-400 ">{nft.salekind == '0'? ("Price: " + nft.price + "ETH"):("Start Price: " + nft.price + "ETH")} </p>
                {
                  (nft.salekind == '1' && nft.reserved != '0') && (<p className="text-1xl my-1 font-bold text-blue-400">Buy now Price: {nft.reserved} ETH</p>)
                }
                {
                  (nft.salekind == '1' && nft.bid?.value.toString()) && (<p className="text-1xl my-1 font-bold text-blue-400">Max bade Price: {web3.utils.fromWei(nft.bid.value.toString(), 'ether')} ETH</p>)
                }
                {
                  curAcount == nft.seller && (<p className="font-bold text-yellow-400 "> ⚠️ You are the seller. </p>)
                }
                {
                  curAcount == nft.seller && nft.binvalid && (nft.salekind != '1' || (nft.salekind == '1' && nft.bid?.value.toString()) == '0') && (<p className="font-bold text-yellow-400 "> ⚠️ Sale ended, you can withdraw it or resale. </p>)
                }
                {
                  (nft.binvalid && curAcount == nft.seller && (!tx || tx[0]!=nft.itemId.toString() || tx[1] != "resellNFTInMarket")) &&
                   (nft.salekind != '1' || (nft.salekind == '1' && nft.bid?.value.toString()) == '0') &&
                  <div className="border p-4">
                    {
                      <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => withdrawNft(nft)}>Withdraw NFT</button>
                    }
                  </div>
                }
                {
                  (nft.binvalid && curAcount == nft.seller && (!tx || tx[0]!=nft.itemId.toString() || tx[1] != "withdawNFTFromMarket")) &&
                  (nft.salekind != '1' || (nft.salekind == '1' && nft.bid?.value.toString()) == '0') &&
                  <div className="border p-4"> 
                    <input
                      size='30'
                      placeholder="Sale Kind(0:Fix, 1:Auction)"
                      className="mt-2 border rounded p-4"
                      onChange={e => updateFormInput({ ...formInput, salekind: e.target.value })}
                    />
                    <input
                      size='30'
                      placeholder="Price/Start Price (ETH)"
                      className="mt-2 border rounded p-4"
                      onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
                    />
                    <input
                      size='30'
                      placeholder="Auction Max Price"
                      className="mt-2 border rounded p-4"
                      onChange={e => updateFormInput({ ...formInput, reserved: e.target.value })}
                    />
                    <input
                      size='30'
                      placeholder="Sale duration(minites)"
                      className="mt-2 border rounded p-4"
                      onChange={e => updateFormInput({ ...formInput, duration: e.target.value })}
                    />
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => resellNft(nft)}>Resell the NFT</button>
                  </div>
                }
                {
                  (nft.salekind == '0' && !nft.binvalid && curAcount != nft.seller) &&
                  <div>
                    {
                        <button disabled={nft.binvalid} className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => buyNft(nft,'0')}>Buy NFT</button>
                    }
                  </div>
                }
                {
                  (nft.salekind == '1' && !nft.binvalid && curAcount != nft.seller) &&
                  <div>
                    <input 
                      disabled={nft.binvalid}
                      placeholder= {nft.binvalid? "bid ended" : "bid price (ETH)"}
                      className="text-2xl border rounded p-1"
                      onChange={e => updateFormInput({ ...formInput, bidPrice: e.target.value })}
                    />
                    <button disabled={nft.binvalid} className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => buyNft(nft,'1')}>Bid</button>
                  </div>
                }
                {
                  (nft.salekind == '1' && nft.binvalid && nft.bid?.value.toString() != '0' && curAcount.toLocaleLowerCase() == nft.bid?.bidder.toLocaleLowerCase()) &&
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => buyNft(nft,'1')}>You are success bidder,get it</button>
                }
                {
                  (nft.salekind == '1' && nft.binvalid && nft.bid?.value.toString() != '0' && curAcount.toLocaleLowerCase() != nft.bid?.bidder.toLocaleLowerCase()) &&
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => buyNft(nft,'1')}>Send the NFT to success bidder</button>
                }
                {
                  tx && tx[0]==nft.itemId.toString() && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx[1]}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)
                }
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
