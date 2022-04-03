import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import web3 from 'web3'
import { useRouter } from 'next/router'
import axios from 'axios'
import Web3Modal from "web3modal"
import Link from 'next/link'
import market from '../config/PICNFTMarket.json';
import nft from '../config/PICNFT.json';
const NETWORK_ID = 4;

const nftmarketaddress = market.networks[NETWORK_ID].address
const nftmarketabi = market.abi
//const nftaddress = nft.networks[NETWORK_ID].address
const nftabi = nft.abi

export default function Home() {
  const [nfts, setNfts] = useState([])
  const [loaded, setLoaded] = useState('not-loaded')
  const [formInput, updateFormInput] = useState({salekind: '', price: '', reserved: '', duration:''})
  const [curAcount, setCurAcount] = useState('')
  const [tx, setTx] = useState([])
  const router = useRouter()

  useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      if(router.asPath == '/my-all-nfts'){
        loadNFTs()
      }
    })
    loadNFTs()
  }, [])


  async function sellNft(nft) {
    //console.log(nft)

    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()
    let nftcontract = new ethers.Contract(nft.token_address,nftabi, signer)


    const approvedall = await nftcontract.isApprovedForAll(nft.owner, nftmarketaddress)
    const approveAddress = await nftcontract.getApproved(nft.token_id)
    //console.log(approvedall, approveAddress)

    if(approveAddress.toLowerCase() != nftmarketaddress.toLowerCase() && !approvedall){
      // approve the nft
      let transaction = await nftcontract.approve(nftmarketaddress,nft.token_id)
      setTx([nft.token_address.toString() + nft.token_id.toString(),'approve'])
      let tx = await transaction.wait()
      //console.log(`waiting for approve NFT ..., ${tx.hash}`)
    }


    // sale
    const marketcontract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
    //get 
    const listingPrice = await marketcontract.listingPrice()
    
    const price = web3.utils.toWei(formInput.price, 'ether')
    const reserved = formInput.salekind =='0'? web3.utils.toWei('0', 'ether'): web3.utils.toWei(formInput.reserved, 'ether')
    const duration = !formInput.duration ? '0': formInput.duration
    const transaction = await marketcontract.sellNFTInMarket(nft.token_address, nft.token_id, formInput.salekind,price,reserved,duration, { value: listingPrice })
    setTx([nft.token_address.toString() + nft.token_id.toString(),'sellNFTInMarket'])
    await transaction.wait()
    
    router.push("/")
  }

  async function listNftInMarket(nft) {
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
      window.alert('when auction reserved price must bigger than start price.');
      return;
    }
    try {
      sellNft(nft)
    } catch (error) {
      //console.log('Error uploading file: ', error);
      window.alert(error)
    }
  }

  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const curAcounttmp = await signer.getAddress();
    setCurAcount(curAcounttmp)

    //not: I just wanted get all NFTs directly from Ethereum, but no good method.
    //So,get from opensea.
    const openseaurl = 'https://testnets-api.opensea.io/api/v1/assets?owner=' + curAcounttmp + '&order_direction=desc&offset=0&limit=20'

    const marketContract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
    //const tokenContract = new ethers.Contract(nftaddress, nftabi, provider)
    //const data = await marketContract.fetchMyNFTsLockedInMarket()
    const datat = await axios.get(openseaurl)
    //console.log('=====>')
    //console.log(datat.data.assets)
    //console.log('<=====')
    const data = datat.data.assets;
    const items = await Promise.all(data.map(async i => {

      let item = {
        owner: curAcounttmp,
        image_url: i.image_url,
        token_address: i.asset_contract.address,
        token_id: i.token_id,
        description: i.description,
        permalink: i.permalink,
        name: i.name
      }
      return item
    }))
    //console.log('items: ', items)
    setNfts(items)
    setLoaded('loaded')
  }
  if (loaded === 'loaded' && !nfts.length) return (<h1 className="p-20 text-4xl">You Have No NFTs!</h1>)
  return (
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-2 gap-4 pt-8">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border p-4 shadow">
                {
                  !nft.image_url? 
                  <p className="text-1xl my-1 font-bold text-red-400">😅 一所懸命コンテンツ表示中...</p>:
                  <img src={nft.image_url} className="rounded" />
                }
                
                <Link href={nft.permalink}>
                  <a className="mr-4 text-blue-500">
                    Refer to Opensea
                  </a>
                </Link>
                <p className="text-1xl my-1 font-bold">Contract: {nft.token_address.substr(0,6)+ '...'}</p>
                <p className="text-1xl my-1 font-bold">TokenId: {nft.token_id.length > 6 ? nft.token_id.substr(0,6)+ '...' : nft.token_id}</p>
                <p className="text-1xl my-1 font-bold">Name: {nft.name}</p>
                <p className="text-1xl my-1 font-bold">Description: {nft.description}</p>
                <p className="text-1xl my-1 font-bold text-yellow-400">😀 Sell NFT in the market</p>
                <div className="border p-4">
                  <input
                  size='30'
                  placeholder="Sale Kind(0:Fix, 1:Auction)"
                  className="mt-1 border rounded p-4"
                  onChange={e => updateFormInput({ ...formInput, salekind: e.target.value })}
                  />
                  <input
                    size='30'
                    placeholder="Price/Start Price (ETH)"
                    className="mt-1 border rounded p-4"
                    onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
                  />
                  <input
                    size='30'
                    placeholder="Auction Max Price"
                    className="mt-1 border rounded p-4"
                    onChange={e => updateFormInput({ ...formInput, reserved: e.target.value })}
                  />
                  <input
                    size='30'
                    placeholder="Sale duration(minites)"
                    className="mt-1 border rounded p-4"
                    onChange={e => updateFormInput({ ...formInput, duration: e.target.value })}
                  />
                  <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => listNftInMarket(nft)}>List the NFT</button>
                </div>
                {
                  tx && tx[0]==(nft.token_address.toString() + nft.token_id.toString()) && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx[1]}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)
                }
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
