import '../styles/globals.css'
import Link from 'next/link'
import Web3Modal from "web3modal"
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import Blockies from 'react-blockies';
import { useRouter } from 'next/router'

function MyApp({ Component, pageProps }) {

  const router = useRouter()
  const [publicAddress, setPublicAddress] = useState('')
  useEffect(() => {
    load()
  }, [])

  async function load() {
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
    console.log(cur)
    setPublicAddress(cur)
  }

  function handleClick(){
    
    router.push('/my-acount')
  }

  // 
  console.log(router.asPath);
  let message = '';
  switch (router.asPath) {
    case '/':
      message = 'ð PIC NFTãã¼ã±ãããã¬ã¤ã¹ã§ã®åå¼ã«ã¯ææ°æãªã';
      break;
    case '/create-item-sale':
      message = 'ð NFTã®ååä¸å ´è²»ç¨ã®ã¿å¾´åãã';
      break;
    case '/proposes':
      message = 'ð ä¸ç·ã«ãã®NFTãã¼ã±ãããã¬ã¤ã¹ããã£ã¨ç´ æ´ããããªããããã«';
      break;
    default:
      break;
  }

  return (
    <div>
      <nav className="border-b px-12 py-6">
      <p className="text-xl text-pink-600">ð¸ð¸ PIC ð¸ð¸</p>
        <p className="text-xl text-pink-600">   Pictures NFT Marketplace </p>
        <p className="text-xl text-green-600"> {message} </p>
        <div className="flex mt-4">
          <Link href="/">
            <a className="mr-4 text-blue-500 font-bold">
              NFTå¸å ´
            </a>
          </Link>
          <Link href="/create-item">
            <a className="mr-4 text-blue-500 font-bold">
              NFTä½æ
            </a>
          </Link>
          <Link href="/create-item-sale">
            <a className="mr-4 text-blue-500 font-bold">
              NFTä½æã¨è²©å£²
            </a>
          </Link>
          <Link href="/my-nfts">
            <a className="mr-4 text-blue-500 font-bold">
              My NFTSs(è³¼å¥æ¸)
            </a>
          </Link>
          <Link href="/my-all-nfts">
            <a className="mr-4 text-blue-500 font-bold">
              My NFTSsï¼ä¿æã®NFTï¼
            </a>
          </Link>
          <a className="mr-4 text-yellow-500 font-bold">
              |
          </a>
          <Link href="/dao-rules">
            <a className="mr-4 text-red-500 font-bold">
              DAO Rules
            </a>
          </Link>
          <Link href="/dao-tokens">
            <a className="mr-4 text-red-500 font-bold">
              DAO Token
            </a>
          </Link>
          <Link href="/proposes">
            <a className="mr-4 text-red-500 font-bold">
               Proposal List(ææ¡ä¸è¦§)
            </a>
          </Link>
          <Link href="/create-propose-flex">
            <a className="mr-4 text-red-500 font-bold">
              Propose(ææ¡ãã)
            </a>
          </Link>
          <div onClick={() => handleClick()}>
            <Blockies seed={publicAddress} size={10} scale={3} />
          </div>
        </div>
      </nav>
      <Component {...pageProps} />
    </div>
  )
}

export default MyApp
