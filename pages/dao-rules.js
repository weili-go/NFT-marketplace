import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import web3 from 'web3'
import axios from 'axios'
import Web3Modal from "web3modal"
import dao from '../config/PICGovernorDAO.json';
import nft from '../config/PICNFT.json';
import market from '../config/PICNFTMarket.json';
import daotoken from '../config/DAOToken.json';
import tl from '../config/PICTimeLock.json';
import Link from 'next/link'

import { useRouter } from 'next/router'
const NETWORK_ID = 4;

const daotokenaddress = daotoken.networks[NETWORK_ID].address
const daotokenabi = daotoken.abi

const daoaddress = dao.networks[NETWORK_ID].address
const daoabi = dao.abi

const tladdress = tl.networks[NETWORK_ID].address
const tlabi = tl.abi

const marketaddress = market.networks[NETWORK_ID].address
const marketabi = market.abi

export default function Home() {
  const [governor, setGovernor] = useState({})
  const [timelock, setTimelock] = useState({})
  const [marketinfo, setMarketinfo] = useState({})
  const [daotokeninfo, setDaotokeninfo] = useState({})
  const [curAcount, setCurAcount] = useState('')
  const router = useRouter()

  useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      if(router.asPath == '/dao-rules'){
        loadNFTs()
      }
    })
    loadNFTs()
  }, [])

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
    
    
    const daoContract = new ethers.Contract(daoaddress, daoabi, signer)
    const blockn = await provider.getBlockNumber()

    const token = await daoContract.token();
    
    const quorum = await daoContract.quorum(blockn-1);
    const proposalThreshold = await daoContract.proposalThreshold();
    const votingDelay = await daoContract.votingDelay();
    const votingPeriod = await daoContract.votingPeriod();
    const timelock = await daoContract.timelock();

    const governor = {
      token: token,
      quorum: quorum.toString(),
      proposalThreshold: proposalThreshold.toString(),
      votingDelay: votingDelay.toString(),
      votingPeriod: votingPeriod.toString(),
      timelock: timelock,
    }

    setGovernor(governor)

    const tl = new ethers.Contract(tladdress, tlabi, signer)
    const mindelay = await tl.getMinDelay();
    const iscancel = await tl.hasRole('0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63', cur)
    const canceller = iscancel? cur: cur+ " is not emergency canceller."
    const timelockobj = {
      mindelay: mindelay.toString(),
      canceller: canceller
    }

    setTimelock(timelockobj)

    const mk = new ethers.Contract(marketaddress, marketabi, signer)
    const balance_tmp = await provider.getBalance(marketaddress)
    const balance_eth = ethers.utils.formatEther(balance_tmp)

    const listingPrice_big = await mk.listingPrice()
    const listingPrice_eth = ethers.utils.formatEther(listingPrice_big)
    const listingPrice = listingPrice_big.toString()
    
    const sellNFTReward = await mk.sellNFTReward()
    const buyNFTReward = await mk.buyNFTReward()

    let eventFilter = mk.filters.Prohibited()
    let events = await mk.queryFilter(eventFilter, 10884314, "latest")
    console.log(events)

    const prohibitednft = [];
    await Promise.all(events.map(async i => {
      const nfta = i.args.nftContract
      const nftt = i.args.tokenId.toString()
      const isb = await mk.blacklist(nfta, nftt)

      if(isb){
        prohibitednft.push({nftAddress:nfta, tokenId:nftt})
      }

    }))

    const prohibitednfts = JSON.stringify(prohibitednft)

/*
const prohibitednft = [{a:'a', b:'b'}]
const prohibitednfts = JSON.stringify(prohibitednft)
*/
    const mkinfo = {
      balanceEth: balance_eth.toString(),
      listingPrice: listingPrice.toString(),
      listingPrice_eth:listingPrice_eth,
      sellNFTReward: sellNFTReward.toString(),
      buyNFTReward: buyNFTReward.toString(),
      prohibitednfts: prohibitednfts,
    }

    setMarketinfo(mkinfo)

    const daotokenContract = new ethers.Contract(daotokenaddress, daotokenabi, signer)

    console.log(`${daotokenContract.address}`);
    const totalsupply = await daotokenContract.totalSupply();
    const capacity = await daotokenContract.capacity();
    const name = await daotokenContract.name();
    const symbol = await daotokenContract.symbol();
    const daot = {
      name,
      symbol,
      curtotalsupply : totalsupply.toString(),
      capacity: capacity.toString(),
    }

    setDaotokeninfo(daot)

  }
  async function onChange(e) {
    const file = e.target.files[0];
  }

  return (
    <div >
    <p className="text-1xl my-1 font-bold flex justify-center text-black-400">💁　DAOに参加するトークン保有者たちは、コーポレートガバナンスの改善を提案し、新しい提案に投票することで、DAOのルールを変更することができる</p>
    <p>　</p>
    <p className="text-1xl my-1 font-bold flex justify-center text-purple-400">Governor contract address: {daoaddress}　⬇</p>
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-1 gap-4 pt-8">
          {
            <div className="border p-4 shadow">
              <p className="text-1xl my-1 font-bold">現状のステートは以下の通りです。</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Proposal Threshold（提案する者のDAO Token残高の閾値）: {governor.proposalThreshold}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Voting quorum（投票定足数の変更）: {governor.quorum}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Voting Delay（投票開始までのブロック数）: {governor.votingDelay}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Voting Period（投票期間）: {governor.votingPeriod}</p>
              <img className="rounded mt-4" width="350" src={'https://raw.githubusercontent.com/weili-go/test/master/pic-nft-market-voting.png'} />
              <p className="text-1xl my-1 font-bold"> 🌼 Governance token address（投票するためのトークン）: {governor.token}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 TimeLock address（提案の実行隊列）: {governor.timelock}</p>
              <p className="text-1xl my-1 font-bold">  　</p>
              <p className="text-1xl my-1 text-black-400 font-bold">以下のガバナンス機能をDAOに移管済み：</p>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ 投票定足数の変更: </p>
              <Link href={"/create-propose?address=" + daoaddress + "&" + "func=updateQuorumNumerator(uint256)" + "&" + "name=Governor"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　updateQuorumNumerator(uint256)
                </a>
              </Link>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ 提案する者のDAO Token残高の閾値の変更:</p>
              <Link href={"/create-propose?address=" + daoaddress + "&" + "func=setProposalThreshold(uint256)" + "&" + "name=Governor"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　setProposalThreshold(uint256)
                </a>
              </Link>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ 投票開始までのブロック数変更:</p>
              <Link href={"/create-propose?address=" + daoaddress + "&" + "func=setVotingDelay(uint256)" + "&" + "name=Governor"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　setVotingDelay(uint256)
                </a>
              </Link>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ 投票期間ブロック数変更</p>
              <Link href={"/create-propose?address=" + daoaddress + "&" + "func=setVotingPeriod(uint256)" + "&" + "name=Governor"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　setVotingPeriod(uint256)
                </a>
              </Link>              
            </div>
          }
        </div>
      </div>
    </div>
    <p className="text-1xl my-1 font-bold">  　</p>
    <p className="text-1xl my-1 font-bold">  　</p>
    <p className="text-1xl my-1 font-bold flex justify-center text-yellow-400">Governance Token contract address: {daotokenaddress}　⬇</p>
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-1 gap-4 pt-8">
          {
            <div className="border p-4 shadow">
              <p className="text-1xl my-1 font-bold">現状のステートは以下の通りです。</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Token Name: {daotokeninfo.name}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Token Symbol: {daotokeninfo.symbol}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Current Total Supply: {daotokeninfo.curtotalsupply}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Token Capacity: { daotokeninfo.capacity}</p>
              <p className="text-1xl my-1 font-bold">  　</p>
              <p className="text-1xl my-1 text-black-400 font-bold">以下のガバナンス機能をDAOに移管済み：</p>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ Admin Mint:</p>
              <Link href={"/create-propose?address=" + daotokenaddress + "&" + "func=adminMint(address,uint256)" + "&" + "name=Voting-Token"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　adminMint(address,uint256)
                </a>
              </Link>              
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ Token Capacityの変更:</p>
              <Link href={"/create-propose?address=" + daotokenaddress + "&" + "func=setCapacity(uint256)" + "&" + "name=Voting-Token"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　setCapacity(uint256)
                </a>
              </Link>                   
            </div>
          }
        </div>
      </div>
    </div>
    <p className="text-1xl my-1 font-bold">  　</p>
    <p className="text-1xl my-1 font-bold">  　</p>
    <p className="text-1xl my-1 font-bold flex justify-center text-green-400">TimeLock contract address: {tladdress}　⬇</p>
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-1 gap-4 pt-8">
          {
            <div className="border p-4 shadow">
              <p className="text-1xl my-1 font-bold">現状のステートは以下の通りです。</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Min delay （s）: {timelock.mindelay}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Emergency Canceler: { timelock.canceller}</p>
              <p className="text-1xl my-1 font-bold">  　</p>
              <p className="text-1xl my-1 text-black-400 font-bold">以下のガバナンス機能をDAOに移管済み：</p>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ 遅延実行時間の変更:</p>
              <Link href={"/create-propose?address=" + tladdress + "&" + "func=updateDelay(uint256)" + "&" + "name=TimeLock"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　updateDelay(uint256)
                </a>
              </Link>   
            </div>
          }
        </div>
      </div>
    </div>
    <p className="text-1xl my-1 font-bold">  　</p>
    <p className="text-1xl my-1 font-bold">  　</p>
    <p className="text-1xl my-1 font-bold flex justify-center text-pink-400">PIC NFT Marketplace contract address: {marketaddress}　⬇</p>
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-1 gap-4 pt-8">
          {
            <div className="border p-4 shadow">
              <p className="text-1xl my-1 font-bold">現状のステートは以下の通りです。</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Marketplace Profits: {marketinfo.balanceEth} ETH</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Marketplace List Fee: { marketinfo.listingPrice_eth } ETH（{ marketinfo.listingPrice} wei）</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Sell NFT Reward: { marketinfo.sellNFTReward}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 Buy NFT Reward: { marketinfo.buyNFTReward}</p>
              <p className="text-1xl my-1 font-bold"> 🌼 NFT Blacklist: { marketinfo.prohibitednfts}</p>
              <p className="text-1xl my-1 font-bold">  　</p>
              <p className="text-1xl my-1 text-black-400 font-bold">以下のガバナンス機能をDAOに移管済み：</p>
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ Marketplace収益の移転:</p>
              <Link href={"/create-propose?address=" + marketaddress + "&" + "func=transferETH(address,uint256)" + "&" + "name=Marketplace"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　transferETH(address,uint256)
                </a>
              </Link>   
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ Marketplaceの上場手数料の変更:</p>
              <Link href={"/create-propose?address=" + marketaddress + "&" + "func=setListingPrice(uint256)" + "&" + "name=Marketplace"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　setListingPrice(uint256)
                </a>
              </Link>   
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ Marketplaceへ上場する者,取引する者へのDAO Tokenの配布数:</p>
              <Link href={"/create-propose?address=" + marketaddress + "&" + "func=setReward(uint256,uint256)" + "&" + "name=Marketplace"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　setReward(uint256,uint256)
                </a>
              </Link>   
              <p className="text-1xl my-1 text-black-400 font-bold"> ✏️ MarketplaceでのNFT取引の禁止:</p>
              <Link href={"/create-propose?address=" + marketaddress + "&" + "func=addBlackNFT(address,uint256)" + "&" + "name=Marketplace"}>
                <a className="mr-4 text-blue-500 font-bold">
                  　　addBlackNFT(address,uint256)
                </a>
              </Link>   
            </div>
          }
        </div>
      </div>
    </div>    
    </div>
  )
}
