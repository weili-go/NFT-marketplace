import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import web3 from 'web3'
import axios from 'axios'
import Web3Modal from "web3modal"
import market from '../config/PICNFTMarket.json';
import nft from '../config/PICNFT.json';
import { useRouter } from 'next/router'
const NETWORK_ID = 4;

const nftmarketaddress = market.networks[NETWORK_ID].address
const nftmarketabi = market.abi
//const nftaddress = nft.networks[NETWORK_ID].address
const nftabi = nft.abi

export default function Home() {
  const [formInput, updateFormInput] = useState({salekind: '', price: '', reserved: '', duration:''})
  const [nfts, setNfts] = useState([])
  const [loaded, setLoaded] = useState('not-loaded')
  const [curAcount, setCurAcount] = useState('')
  const [tx, setTx] = useState([])
  const router = useRouter()

  useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      if(router.asPath == '/my-nfts'){
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
    const chainid = await provider.getNetwork()
    console.log(`chainid is ${chainid.chainId}`)
    if(chainid.chainId != 4){
      window.alert('Please change to Rinkeby network.')
      return
    }
    const signer = provider.getSigner()
    const marketContract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
  
    const transaction = await marketContract.withdawNFTFromMarket(nft.itemId)
    setTx([nft.itemId.toString(),'withdawNFTFromMarket'])
    await transaction.wait()
  
    loadNFTs()
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
    const nftContract = nft.nftContract
    const transaction = await marketcontract.resellNFTInMarket(itemId, nftContract, tokenId, formInput.salekind,price,reserved,duration)
    setTx([nft.itemId.toString(),'resellNFTInMarket'])
    await transaction.wait()
    //loadNFTs()
    router.push("/")
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
      window.alert('when auction reserved price must bigger than start price.');
      return;
    }
    try {
      resellNftInMarket(nft)
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
    const chainid = await provider.getNetwork()
    console.log(`chainid is ${chainid.chainId}`)
    if(chainid.chainId != 4){
      window.alert('Please change to Rinkeby network.')
      return
    }
    const signer = provider.getSigner()
    const cur = await signer.getAddress();
    setCurAcount(cur)

    const marketContract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
    //const tokenContract = new ethers.Contract(nftaddress, nftabi, provider)
    const data = await marketContract.fetchMyNFTsLockedInMarket()

    const items = await Promise.all(data.map(async i => {
      const tokenContract = new ethers.Contract(i.nftContract, nftabi, provider)
      let tokenUri = await tokenContract.tokenURI(i.tokenId)
      
      if(tokenUri.indexOf('ipfs://') == 0){
        tokenUri = tokenUri.replace('ipfs://','https://ipfs.io/ipfs/')
      }
      const meta = await axios.get(tokenUri)
      const bid = await marketContract.bids(i.itemId.toString())

      let price = i.salekind.toString() == '0'? web3.utils.fromWei(i.price.toString(), 'ether'):
        web3.utils.fromWei(bid.value.toString(), 'ether')

      let image = meta.data.image;
      if(image.indexOf('ipfs://') == 0){
        image = image.replace('ipfs://','https://ipfs.io/ipfs/')
      }

      let item = {
        itemId: i.itemId,
        nftContract: i.nftContract,
        tokenId: i.tokenId,
        price,
        seller: i.seller,
        owner: i.owner,
        image,
        name: meta.data.name,
        description: meta.data.description,
      }
      return item
    }))
    //console.log('items: ', items)
    setNfts(items)
    setLoaded('loaded')
  }

  if (loaded === 'loaded' && !nfts.length) return (<h1 className="p-20 text-4xl">No NFT in the market to been listed!</h1>)

  return (
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-2 gap-4 pt-8">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border p-4 shadow">
                <img src={nft.image} className="rounded" />
                <p className="text-1xl my-1 font-bold">Seller: {nft.seller.substr(0,6)+ '...'}</p>
                <p className="text-1xl my-1 font-bold">Price paid: {nft.price} Ether</p>
                <p className="text-1xl my-1 font-bold">NFT Contract: {nft.nftContract.substr(0,6)+ '...'}</p>
                <p className="text-1xl my-1 font-bold">NFT Token Id: {nft.tokenId.toString().length > 6 ? nft.tokenId.toString().substr(0,6)+ '...' : nft.tokenId.toString()}</p>
                <p className="text-1xl my-1 font-bold">Name: {nft.name}</p>
                <p className="text-1xl my-1 font-bold">Description: {nft.description}</p>
                {
                  (curAcount == nft.owner && (!tx || tx[0]!=nft.itemId.toString() || tx[1] != "resellNFTInMarket")) &&
                  <div className="border p-4">
                    {
                      <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => withdrawNft(nft)}>Withdraw NFT</button>
                    }
                  </div>
                }
                {
                  (curAcount == nft.owner && (!tx || tx[0]!=nft.itemId.toString() || tx[1] != "withdawNFTFromMarket")) &&
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
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => resellNft(nft)}>Resell the NFT</button>
                  </div>
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
