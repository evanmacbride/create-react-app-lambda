import React from "react"
import Landing from "./Landing"
import Page from "./Page"
import Header from "./Header"
import SearchResults from "./SearchResults"

// Find the asset that includes the query name in its title. If no
// asset contains the query name, return the first one in the array.
/*function findMainAsset(assetTitleArray, query) {
	for (let i = 0; i < assetTitleArray.length; i++) {
		if (assetTitleArray[i].includes(query)) {
			return assetTitleArray[i];
		}
	}
	return assetTitleArray[0];
}*/

const Mode = {
	LAND: 0,
	SEARCH: 1,
	READ: 2
};

const RESULTS_PER_PAGE = 20;

class App extends React.Component {
	constructor() {
		super();
		this.state = {
			loading: false,
			offset: 0,
			pageLink: null,
			pageText: null,
			query: null,
			results: null,
			siteMode: Mode.LAND,
			tableOfContents: null,
			title: null,
			totalHits: 0
		};
		this.handleFormChange = this.handleFormChange.bind(this);
		this.handleFormSubmit = this.handleFormSubmit.bind(this);
		this.handleCardClick = this.handleCardClick.bind(this);
		this.handleLogoClick = this.handleLogoClick.bind(this);
	}
	
	handleFormChange(text) {
		this.setState({
			query: text
		});		
	}
	
	// TODO: Remove code examples and elide the p tags they separate. Only
	// fetch page after user clicks the associated page card.
	
	handleCardClick(id) {
		this.setState({loading: true, siteMode: Mode.READ});
		fetch("https://en.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts&pageids=" + 
			id + "&format=json&redirects&explaintext")
			.then(response => response.json())
			.catch(err => {
				console.log(err);
				return Promise.reject(err);
			})
			.then(response => {
				this.setState({loading: false});
				if (Object.values(response.query.pages)[0].hasOwnProperty("missing")) {
					this.setState(
						{loading: false,
						title: "Search Failed",
						pageText: "Could not retrieve page id " + id + ". Please try again."});
					return;
				}
				
				// Get the title
				this.setState({title: Object.values(response.query.pages)[0].title});
				// Process the text.
				
				// Restore newlines lost by ignoring footnotes. (Insert a
				// newline into elisions between lowercase letters, a period,
				// and an uppercase letter.)
				let responseText = Object.values(response.query.pages)[0].extract;
				
				responseText = responseText.replace(/ {2,}/g, ' ');
				responseText = responseText.replace(/(\S"?'?\)?\."?\)?)(\(?'?"?[A-Z][^.])/g,'$1\n$2');
				// Catch paragraphs ending in a quote
				responseText = responseText.replace(/('?\.")([A-Z])/g,'$1\n$2');
				
				// Remove pronunciation guides
				responseText = responseText.replace(/ \( ?[A-Z].*:.*\)/g, '');
				responseText = responseText.replace(/ \(.*listen.*\)/g, '');
				responseText = responseText.replace(/ \( +\S+ +\)/g, '');
				
				// Remove artifacts from code examples
				responseText = responseText.replace(/^ *\{.*displaystyle.*\} *$/g, '');
				
				// Use booleans to apply appropriate classes to set margins
				// to keep the baseline grid before and after h 
				// tags maintained.
				let beneathH3 = false;
				let beneathP = false;
				
				// Use lastTag and deleteList to detect identical adjacent h
				// tags and flag them for removal. All but the last of a set
				// of identical h tags would be a header for an empty section.
				let lastTag = '';
				let deleteList = [];
				let contentsTableList = [];
				
				// Use breaklist to catch header text that indicates the main
				// text has ended.
				const breakList = ["== GALLERY ==", "== NOTES ==", 
					"== REFERENCES ==",	"== EXTERNAL LINKS ==", "== SEE ALSO ==",
					"== SELECTED BIBLIOGRAPHY ==", "== BIBLIOGRAPHY =="];
				const breakPoints = [];
				
				//let textArray = responseText.split(/[\r\n]+/).map((text, index) => {
				let textArray = responseText.split(/[\r\n|\r|\n]+/).map((text, index) => {	
					// Ignore text that's all whitespace or a single character or word.
					text = text.trim();
					if (breakList.indexOf(text.toUpperCase()) > -1) {
						breakPoints.push(index);
					}
					if (!text.includes(" ")) {
						return null;
					}
					else if (text.includes("=====")) {
						
						// Catch identical adjacent h tags
						if (lastTag === "h5") {
							deleteList.push(index - 1);
						}
						lastTag = "h5";
						
						// Remove old formatting and apply new h tag
						const find = "=====";
						const re = new RegExp(find, 'g');
						text = text.replace(re, '').trim();
						
						// Apply appropriate class for proper 
						// baseline alignment
						beneathH3 = false;
						if (beneathP) {
							beneathP = false;
							return <h5 className="beneathP" key={index}>{text}</h5>;
						}
						return <h5 key={index}>{text}</h5>;
					}
					else if (text.includes("====")) {
						
						// Catch identical adjacent h tags
						if (lastTag === "h4") {
							deleteList.push(index - 1);
						}
						lastTag = "h4";
						
						// Remove old formatting and apply new h tag
						const find = "====";
						const re = new RegExp(find, 'g');
						text = text.replace(re, '').trim();
						
						// Apply appropriate class for proper 
						// baseline alignment
						beneathH3 = false;
						if (beneathP) {
							beneathP = false;
							return <h4 className="beneathP" key={index}>{text}</h4>;
						}
						return <h4 key={index}>{text}</h4>;
					}
					else if (text.includes("===")) {
						if (lastTag === "h3") {
							deleteList.push(index - 1);
						}
						lastTag = "h3";
						const find = "===";
						const re = new RegExp(find, 'g');
						text = text.replace(re, '').trim();
						beneathH3 = true;
						beneathP = false;
						return <h3 key={index}>{text}</h3>;						
					}
					else if (text.includes("==")) {
						if (lastTag === "h2") {
							deleteList.push(index - 1);
						}
						lastTag = "h2";
						const find = "==";
						const re = new RegExp(find, 'g');
						text = text.replace(re, '').trim();
						const linkText = "#" + text;
						contentsTableList.push(<li key={index + text}><a href={linkText}>{text}</a></li>);
						return <h2 id={text} key={index}>{text}</h2>;						
					}
					lastTag = "p";
					beneathP = true;
					if (beneathH3) {
						beneathH3 = false;
						return <p className="beneathH3" key={index}>{text}</p>;
					}
					return <p key={index}>{text}</p>;
				});
					
				// Remove text after first breakpoint
				textArray = textArray.slice(0, breakPoints[0]);
				
				// Go back and remove headers for empty sections.
				for (let i = 0; i < deleteList.length; i++) {
					textArray.splice(deleteList[i], 1);
				}
				this.setState({
					pageLink: "https://en.wikipedia.org/?curid=" + id,
					pageText: textArray,
					tableOfContents: contentsTableList
				})
			}
		)
		.catch(err => {
			console.log(err);
			this.setState(
				{loading:false,
				title: "Search Failed",
				pageText: "Could not contact Wikipedia. Please check your internet connection and try again."});	
		}
		);
	}
	
	// Return srlimit pages that match query
	handleFormSubmit(offset, direction) {
		let newOffset = 0;
		// Advance the offset when clicking "Next".
		if (direction > 0) {
			if (this.state.offset + RESULTS_PER_PAGE <= this.state.totalHits) {
				newOffset = this.state.offset + RESULTS_PER_PAGE;
			} else {
				return;
		}
		// Decrement the offset when clicking "Previous". Make sure
		// a previous page is available beforehand. If none is, 
		// do nothing.
		} else if (direction < 0) {
			if (this.state.offset - RESULTS_PER_PAGE > 0) {
				newOffset = this.state.offset - RESULTS_PER_PAGE;
			} else {
				newOffset = 0;	
			}
		}
		this.setState({offset: newOffset});
		this.setState({loading: true, siteMode: Mode.SEARCH});
		fetch("https://en.wikipedia.org/w/api.php?origin=*&action=query" + 
			"&format=json&list=search&srsearch=" + this.state.query + 
			"&srprop=snippet&srlimit=20&continue&sroffset=" + newOffset)
			.then(response => response.json())
			.catch(err => {
				console.log(err);
				return Promise.reject(err);
			})
			.then(response => {
				const resultTotal = response.query.searchinfo.totalhits;
				if (resultTotal === 0) {
					this.setState(
						{
						loading: false,
						results: "Your search for '" + this.state.query +
							"' yielded zero results. Please try again.",
						title: "Search Failed"});
					return;
				}
				this.setState({totalHits: resultTotal});
				const searchResults = response.query.search.map((result,index) => {
					const cardTitle = result.title;
					//console.log(result);
					const div = document.createElement("div");
					div.innerHTML = result.snippet.replace(/ \(listen\)/g, '') + "...";
					const cardSnippet = div.textContent || div.innerText;
					const pageid = result.pageid;
					return (
						<div 
							className="resultCard" 
							key={index} 
							onClick={() => this.handleCardClick(pageid)}
							>
							<h2>{cardTitle}</h2>
							<p>{cardSnippet}</p>
						</div>
					)
				});
				this.setState({
					loading: false,
					subTitle: "Showing " + (this.state.offset + 1) + " - " + 
						Math.min(this.state.offset + RESULTS_PER_PAGE,this.state.totalHits) +
						" out of " + this.state.totalHits,
					title: "Search Results for '" + this.state.query + "'",
					results: searchResults});
			}
		)
		.catch(err => {
			console.log(err);
			this.setState({
				loading: false,
				title: "Search Failed",
				results: "Could not contact Wikipedia. Please check your internet connection and try again."
			});	
		});
	}
	
	handleLogoClick() {
		this.setState({siteMode: Mode.LAND});
	}
	
	render() {
		const land = (	
							<main className="landingMain">
								<Landing 
									onFormChange={this.handleFormChange}
									onFormSubmit={this.handleFormSubmit}		
								/>
							</main>
						);
		const head = (
							<Header 
								offset={this.state.offset}
								onFormChange={this.handleFormChange}
								onFormSubmit={this.handleFormSubmit}
								onLogoClick={this.handleLogoClick}
							/>
						);
		const load = (
							<main className="loadingMain">
								<h1 className="loadingMessage">Loading...</h1>
							</main>
						);
		const search =	(
							<main>
								<SearchResults
									offset={this.state.offset}
									results={this.state.results}
									subTitle={this.state.subTitle}
									title={this.state.title}
									totalHits={this.state.totalHits}
									onCardClick={this.handleCardClick}
									onNextClick={this.handleFormSubmit}
									onPreviousClick={this.handleFormSubmit}
								/>
								<button 
									className="jumpTop"
									onClick={() => window.scrollTo(0, 0)}
									><svg className="arrowBtn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5.362 3.528">
										<path d="M2.681.847L.762 3.527H0L2.512 0h.338l2.512 3.528H4.6z"/>
									</svg></button>
							</main>
						);
		const read =	(
							<main>
								<Page 
									tableOfContents={this.state.tableOfContents}
									title={this.state.title}
									pageLink={this.state.pageLink}
									pageText={this.state.pageText}
								/>
								<button 
									className="jumpTop"
									onClick={() => window.scrollTo(0, 0)}
									><svg className="arrowBtn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5.362 3.528">
										<path d="M2.681.847L.762 3.527H0L2.512 0h.338l2.512 3.528H4.6z"/>
									</svg></button>
							</main>
						);
		return (
			<div className="wrap">
				{this.state.siteMode !== Mode.LAND && head}
				{this.state.loading && load}
				{(this.state.siteMode === Mode.LAND && !this.state.loading) && land}
				{(this.state.siteMode === Mode.SEARCH && !this.state.loading) && search}
				{(this.state.siteMode === Mode.READ && !this.state.loading) && read}
				<footer className="siteFooter">&#169; 2019 Evan MacBride</footer>
			</div>
		)
	}
}

export default App